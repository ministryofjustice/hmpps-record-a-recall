import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { isBefore, isEqual, isAfter, min } from 'date-fns'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import revocationDateCrdsDataComparison from '../../utils/revocationDateCrdsDataComparison'
import getJourneyDataFromRequest, {
  getAdjustmentsToConsiderForValidation,
  getCrdsSentences,
  getExistingAdjustments,
  getRecallRoute,
  RecallJourneyData,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class RevocationDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errorsParam => {
      const validationErrors = { ...(errorsParam || {}) } as Record<string, FormWizard.Controller.Error>
      const { values } = req.form
      const sentences = getCrdsSentences(req)

      const earliestSentenceDate = min(sentences.map(s => new Date(s.sentenceDate)))

      if (isBefore(values.revocationDate as string, earliestSentenceDate)) {
        validationErrors.revocationDate = this.formError('revocationDate', 'mustBeAfterEarliestSentenceDate')
      }

      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const allExistingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      const adjustmentsToConsider = getAdjustmentsToConsiderForValidation(journeyData, allExistingAdjustments)

      const revocationDate = new Date(values.revocationDate as string)

      const isWithinAdjustment = adjustmentsToConsider.some((adjustment: AdjustmentDto) => {
        if (!adjustment.fromDate || !adjustment.toDate) return false

        return (
          (isEqual(revocationDate, adjustment.fromDate) || isAfter(revocationDate, adjustment.fromDate)) &&
          isBefore(revocationDate, adjustment.toDate)
        )
      })

      if (isWithinAdjustment) {
        validationErrors.revocationDate = this.formError('revocationDate', 'cannotBeWithinAdjustmentPeriod')
      }

      callback(validationErrors)
    })
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (getRecallRoute(req) !== 'MANUAL') {
      revocationDateCrdsDataComparison(req)
    }
    return super.successHandler(req, res, next)
  }
}
