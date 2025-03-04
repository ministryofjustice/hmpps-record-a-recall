import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { isBefore, min } from 'date-fns'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import recallDateCrdsDataComparison from '../../utils/recallDateCrdsDataComparison'
import { getCrdsSentences, getRecallOptions } from '../../helpers/formWizardHelper'

export default class RecallDateController extends RecallBaseController {
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

      if (isBefore(values.recallDate as string, earliestSentenceDate)) {
        validationErrors.recallDate = this.formError('recallDate', 'mustBeAfterEarliestSentenceDate')
      }

      callback({ ...errors, ...validationErrors })
    })
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (getRecallOptions(req) !== 'MANUAL_ONLY') {
      recallDateCrdsDataComparison(req)
    }
    return super.successHandler(req, res, next)
  }
}
