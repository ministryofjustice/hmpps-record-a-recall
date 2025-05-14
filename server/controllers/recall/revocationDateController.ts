import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { isBefore, isAfter, min, isEqual } from 'date-fns'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import revocationDateCrdsDataComparison from '../../utils/revocationDateCrdsDataComparison'
import { getCrdsSentences, getExistingAdjustments, getRecallRoute } from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class RevocationDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const sentences = getCrdsSentences(req)

      const earliestSentenceDate = min(sentences.map(s => new Date(s.sentenceDate)))

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (isBefore(values.revocationDate as string, earliestSentenceDate)) {
        validationErrors.revocationDate = this.formError('revocationDate', 'mustBeAfterEarliestSentenceDate')
      }

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)

      const revocationDate = new Date(values.revocationDate as string)

      const isWithinAdjustment = existingAdjustments.some(adjustment => {
        if (!adjustment.fromDate || !adjustment.toDate) return false

        return (
          (isEqual(revocationDate, adjustment.fromDate) || isAfter(revocationDate, adjustment.fromDate)) &&
          isBefore(revocationDate, adjustment.toDate)
        )
      })

      if (isWithinAdjustment) {
        validationErrors.revocationDate = this.formError('revocationDate', 'cannotBeWithinAdjustmentPeriod')
      }

      callback({ ...errors, ...validationErrors })
    })
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (getRecallRoute(req) !== 'MANUAL') {
      revocationDateCrdsDataComparison(req)
    }
    return super.successHandler(req, res, next)
  }
}
