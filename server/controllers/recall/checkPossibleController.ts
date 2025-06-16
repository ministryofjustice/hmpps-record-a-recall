import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { ValidationMessage } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { getRecallRoute, sessionModelFields } from '../../helpers/formWizardHelper'
import determineRecallEligibilityFromValidation from '../../utils/crdsValidationUtil'
import { eligibilityReasons } from '../../@types/recallEligibility'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { NomisDpsSentenceMapping } from '../../@types/nomisMappingApi/nomisMappingApiTypes'

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

            const cases = await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)

            const activeCases = cases.filter(caseItem => caseItem.status === 'ACTIVE')
            res.locals.courtCases = activeCases
            const sentencesFromRasCases = activeCases.flatMap(caseItem => caseItem.sentences.map(sentence => ({
              ...sentence,
              sentenceDate: caseItem.date,
            })) || [])

            const [sentences, breakdown] = await Promise.all([
              this.getCrdsSentences(req, res),
              this.getCalculationBreakdown(req, res),
            ])
            const sentenceSequenceNumbers = sentences.map(sentence => sentence.sentenceSequence)
            const firstBookingId = sentences[0].bookingId

            const dpsSentenceSequenceIds = await this.getNomisToDpsMapping(req, sentenceSequenceNumbers, firstBookingId) // get sequence numbers

            res.locals.dpsSentenceIds = dpsSentenceSequenceIds.map(mapping => mapping.dpsSentenceId)

            const matchedRaSSentences = sentencesFromRasCases.filter(sentence =>
              dpsSentenceSequenceIds.some(mapping => mapping.dpsSentenceId === sentence.sentenceUuid),
            )

            res.locals.rasSentences = matchedRaSSentences.map(sentence => ({
              ...sentence,
              dpsSentenceUuid: sentence.sentenceUuid,
            }))

            res.locals.crdsSentences = sentences.map(sentence => ({
              ...sentence,
              dpsSentenceUuid: dpsSentenceSequenceIds.find(
                mapping => mapping.nomisSentenceId.nomisSentenceSequence === sentence.sentenceSequence,
              )?.dpsSentenceId,
            }))

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
    req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, res.locals.courtCases)
    req.sessionModel.set(sessionModelFields.SENTENCES, res.locals.crdsSentences)
    req.sessionModel.set(sessionModelFields.RAS_SENTENCES, res.locals.rasSentences)
    req.sessionModel.set(sessionModelFields.TEMP_CALC, res.locals.temporaryCalculation)
    req.sessionModel.set(sessionModelFields.BREAKDOWN, res.locals.breakdown)
    req.sessionModel.set(sessionModelFields.EXISTING_ADJUSTMENTS, res.locals.existingAdjustments)
    req.sessionModel.set(sessionModelFields.DPS_SENTENCE_IDS, res.locals.dpsSentenceIds)

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

  getCrdsSentences(req: FormWizard.Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getSentencesAndReleaseDates(calcReqId, username)
  }

  async getNomisToDpsMapping(
    req: FormWizard.Request,
    sentenceSequenceNumbers: number[],
    firstBookingId: number,
  ): Promise<NomisDpsSentenceMapping[]> {
    const nomisSentenceInformation = sentenceSequenceNumbers.map(sentence => ({
      nomisSentenceSequence: sentence,
      nomisBookingId: firstBookingId,
    }))

    return req.services.nomisMappingService.getNomisToDpsMappingLookup(nomisSentenceInformation, req.user.username)
  }
}
