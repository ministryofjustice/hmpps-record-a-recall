import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { ValidationMessage } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { getRecallRoute, sessionModelFields } from '../../helpers/formWizardHelper'
import determineRecallEligibilityFromValidation from '../../utils/crdsValidationUtil'
import { eligibilityReasons } from '../../@types/recallEligibility'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class CheckPossibleController extends RecallBaseController {
  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      const errors: ValidationMessage[] = await req.services.calculationService.performCrdsValidation(nomisId, username)
      res.locals.validationResponse = errors
      const recallEligibility = determineRecallEligibilityFromValidation(errors)
      res.locals.recallEligibility = recallEligibility
      if (recallEligibility !== eligibilityReasons.CRITICAL_VALIDATION_FAIL) {
        await this.getTemporaryCalculation(req, res)
          .then(async newCalc => {
            res.locals.temporaryCalculation = newCalc
            res.locals.calcReqId = newCalc.calculationRequestId
            logger.debug(newCalc.dates)
            const [sentences, breakdown] = await Promise.all([
              this.getSentences(req, res),
              this.getCalculationBreakdown(req, res),
            ])

            const sentenceSequence = sentences.map(sentence => sentence.sentenceSequence)
            const firstBookingId = sentences[0].bookingId

            console.log('sentenceSequence', sentenceSequence)
            console.log('firstBookingId', firstBookingId)

            // const dpsSentenceSequenceIds = this.getNomisToDpsMapping(sentenceSequence, firstBookingId) // get sequence numbers
            // const rasSentences = ras.getSentenceInfo(dpsSentenceSequenceIds)
            // res.locals.sentences = rasSentences
            res.locals.breakdown = breakdown
          })
          .catch(error => {
            logger.error(error.userMessage)
          })

        res.locals.existingAdjustments = await req.services.adjustmentsService
          .searchUal(nomisId, username)
          .catch((e: Error): AdjustmentDto[] => {
            logger.error(e.message)
            return []
          })
      }
    } catch (error) {
      logger.error(error)
    }
    return super.configure(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    req.sessionModel.set(sessionModelFields.ENTRYPOINT, res.locals.entrypoint)
    req.sessionModel.set(sessionModelFields.RECALL_ELIGIBILITY, res.locals.recallEligibility)
    const errors: ValidationMessage[] = res.locals.validationResponse
    if (getRecallRoute(req) === 'NOT_POSSIBLE') {
      const crdsValidationErrors = errors.map(error => error.message)
      res.locals.crdsValidationErrors = crdsValidationErrors
      req.sessionModel.set(sessionModelFields.CRDS_ERRORS, crdsValidationErrors)
    } else if (getRecallRoute(req) === 'MANUAL') {
      req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
    }
    req.sessionModel.set(sessionModelFields.SENTENCES, res.locals.sentences)
    req.sessionModel.set(sessionModelFields.TEMP_CALC, res.locals.temporaryCalculation)
    req.sessionModel.set(sessionModelFields.BREAKDOWN, res.locals.breakdown)
    req.sessionModel.set(sessionModelFields.EXISTING_ADJUSTMENTS, res.locals.existingAdjustments)

    return { ...locals }
  }

  recallPossible(req: FormWizard.Request, res: Response) {
    return getRecallRoute(req) && getRecallRoute(req) !== 'NOT_POSSIBLE'
  }

  getTemporaryCalculation(req: FormWizard.Request, res: Response) {
    const { nomisId, username } = res.locals
    return req.services.calculationService.calculateTemporaryDates(nomisId, username)
  }

  getCalculationBreakdown(req: FormWizard.Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getCalculationBreakdown(calcReqId, username)
  }

  getSentences(req: FormWizard.Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getSentencesAndReleaseDates(calcReqId, username)
  }
}
