import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import {
  RecordARecallCalculationResult,
  ValidationMessage,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { getRecallRoute, sessionModelFields } from '../../helpers/formWizardHelper'
import determineRecallEligibilityFromValidation from '../../utils/crdsValidationUtil'
import { eligibilityReasons } from '../../@types/recallEligibility'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../../@types/nomisMappingApi/nomisMappingApiTypes'
import { RecallableSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

import { isNonRecallableSentence } from '../../utils/nonRecallableSentenceUtils'

export default class CheckPossibleController extends RecallBaseController {
  /**
   * Filters court cases to exclude those with only non-recallable sentences
   * and checks if any cases were filtered out
   */
  private filterCourtCasesWithNonRecallableSentences(cases: CourtCase[]): {
    filteredCases: CourtCase[]
    wereCasesFilteredOut: boolean
  } {
    const filteredCases = cases.filter(courtCase => {
      if (!courtCase.sentences || courtCase.sentences.length === 0) {
        return false // Exclude cases with no sentences
      }

      // Check if case has at least one recallable sentence
      const hasRecallable = courtCase.sentences.some(
        (sentence: RecallableSentence) => !isNonRecallableSentence(sentence),
      )

      return hasRecallable
    })

    // Check if we filtered out cases (meaning some had only non-recallable sentences)
    const wereCasesFilteredOut = filteredCases.length < cases.length

    return { filteredCases, wereCasesFilteredOut }
  }

  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      const calculationResult: RecordARecallCalculationResult =
        await req.services.calculationService.getTemporaryCalculation(nomisId, username)

      const errors: ValidationMessage[] = calculationResult.validationMessages

      res.locals.validationResponse = errors
      const recallEligibility = determineRecallEligibilityFromValidation(errors)
      res.locals.recallEligibility = recallEligibility

      if (
        recallEligibility !== eligibilityReasons.CRITICAL_VALIDATION_FAIL &&
        calculationResult.calculatedReleaseDates
      ) {
        const newCalc = calculationResult.calculatedReleaseDates
        res.locals.temporaryCalculation = newCalc
        res.locals.calcReqId = newCalc.calculationRequestId
        logger.debug(newCalc.dates)

        const cases = await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)

        const activeCases = cases.filter(caseItem => caseItem.status === 'ACTIVE')

        // Apply non-recallable sentence filtering
        const { filteredCases, wereCasesFilteredOut } = this.filterCourtCasesWithNonRecallableSentences(activeCases)

        // If we would normally go to manual journey but the only issue is non-recallable sentences,
        // override to normal journey and use filtered cases
        let casesToUse = activeCases
        if (
          recallEligibility.recallRoute === 'MANUAL' &&
          recallEligibility === eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL &&
          wereCasesFilteredOut
        ) {
          // Override recall eligibility to normal journey since we've filtered out the problematic cases
          res.locals.recallEligibility = eligibilityReasons.HAPPY_PATH_POSSIBLE
          casesToUse = filteredCases
        }

        res.locals.courtCases = casesToUse
        const sentencesFromRasCases = casesToUse.flatMap(caseItem => caseItem.sentences || [])

        const [sentences, breakdown] = await Promise.all([
          this.getCrdsSentences(req, res),
          this.getCalculationBreakdown(req, res),
        ])
        const nomisSentenceInformation = sentences.map(sentence => {
          return {
            nomisSentenceSequence: sentence.sentenceSequence,
            nomisBookingId: sentence.bookingId,
          }
        })
        const dpsSentenceSequenceIds = await this.getNomisToDpsMapping(req, nomisSentenceInformation)

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

        res.locals.existingAdjustments = await req.services.adjustmentsService
          .searchUal(nomisId, username)
          .catch((e: Error): AdjustmentDto[] => {
            logger.error(e.message)
            return []
          })
      }

      return super.configure(req, res, next)
    } catch (error) {
      logger.error(error)
      return next(error)
    }
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
    nomisSentenceInformation: NomisSentenceId[],
  ): Promise<NomisDpsSentenceMapping[]> {
    return req.services.nomisMappingService.getNomisToDpsMappingLookup(nomisSentenceInformation, req.user.username)
  }
}
