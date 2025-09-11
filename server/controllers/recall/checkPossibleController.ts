import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'

import {
  RecordARecallCalculationResult,
  ValidationMessage,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { getRecallRoute } from '../../helpers/formWizardHelper'
import { SessionManager } from '../../services/sessionManager'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../../@types/nomisMappingApi/nomisMappingApiTypes'
import { RecallRoutingService } from '../../services/RecallRoutingService'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { COURT_MESSAGES } from '../../utils/courtConstants'

export default class CheckPossibleController extends RecallBaseController {
  private recallRoutingService: RecallRoutingService

  constructor(options: FormWizard.Controller.Options) {
    super(options)
    this.recallRoutingService = new RecallRoutingService()
  }

  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      let calculationResult: RecordARecallCalculationResult = null
      let breakdown = null
      let errors: ValidationMessage[] = []
      let forceManualRoute = false

      try {
        // Get calculation result and validation messages
        calculationResult = await req.services.calculationService.getTemporaryCalculation(nomisId, username)
        errors = calculationResult.validationMessages || []
        res.locals.validationResponse = errors

        // Get breakdown immediately if we have calculation results
        if (calculationResult.calculatedReleaseDates) {
          const tempCalcReqId = calculationResult.calculatedReleaseDates.calculationRequestId
          breakdown = await req.services.calculationService.getCalculationBreakdown(tempCalcReqId, username, nomisId)

          // If breakdown is undefined due to stale calculation, trigger a fresh calculation
          if (!breakdown) {
            logger.info(
              `Breakdown was undefined for calculation ${tempCalcReqId}, triggering fresh calculation for ${nomisId}`,
            )
            try {
              const freshCalc = await req.services.calculationService.getTemporaryCalculation(nomisId, username)
              if (freshCalc?.calculatedReleaseDates?.calculationRequestId) {
                calculationResult = freshCalc
                const newCalcReqId = freshCalc.calculatedReleaseDates.calculationRequestId
                logger.info(`Got fresh calculation with ID ${newCalcReqId}, attempting to get breakdown`)
                // Try to get the breakdown for the new calculation, but don't fail if it's still stale
                breakdown = await req.services.calculationService.getCalculationBreakdown(
                  newCalcReqId,
                  username,
                  nomisId,
                )
              }
            } catch (recalcError) {
              logger.error(`Failed to get fresh calculation after stale breakdown: ${recalcError.message}`)
              // Continue with undefined breakdown rather than failing completely
            }
          }
        }
      } catch (calculationError) {
        // Check if this is the STANDARD_RECALL_255 error
        const errorCode = calculationError.data?.errorCode || calculationError.data?.developerMessage
        const errorText = calculationError.text || JSON.stringify(calculationError.data || '')
        const isStandardRecall255Error =
          calculationError.status === 500 &&
          (errorCode?.includes('STANDARD_RECALL_255') || errorText?.includes('STANDARD_RECALL_255'))

        if (isStandardRecall255Error) {
          logger.warn(`STANDARD_RECALL_255 error for nomisId ${nomisId}, routing to manual journey`)
          forceManualRoute = true
          // Set minimal calculation result to prevent null errors
          calculationResult = {
            calculatedReleaseDates: null,
            validationMessages: [],
          }
        } else {
          // Re-throw if it's a different error
          throw calculationError
        }
      }

      // Get court cases, adjustments, and existing recalls in parallel
      const [cases, existingAdjustments, existingRecalls] = await Promise.all([
        req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username),
        req.services.adjustmentsService.searchUal(nomisId, username).catch((e: Error): AdjustmentDto[] => {
          logger.error(e.message)
          return []
        }),
        req.services.recallService.getAllRecalls(nomisId, username).catch((e: Error): Recall[] => {
          logger.error('Error loading existing recalls:', e.message)
          return []
        }),
      ])

      // Enhance court cases with court names
      let enhancedCases = cases
      if (cases && cases.length > 0) {
        try {
          const courtCodes = [...new Set(cases.map(c => c.location).filter(Boolean))]
          if (courtCodes.length > 0) {
            const courtNamesMap = await req.services.courtService.getCourtNames(courtCodes, username)
            enhancedCases = cases.map(courtCase => ({
              ...courtCase,
              locationName:
                courtNamesMap.get(courtCase.location) || courtCase.locationName || COURT_MESSAGES.NAME_NOT_AVAILABLE,
            }))
          }
        } catch (error) {
          logger.error(`Error fetching court names for nomisId ${nomisId}:`, error)
          // Continue with original cases if court name fetching fails
        }
      }

      // Use routing service for smart filtering and routing decisions
      const routingResponse = await this.recallRoutingService.routeRecallWithSmartFiltering(
        nomisId,
        enhancedCases,
        existingAdjustments,
        existingRecalls,
        breakdown,
        errors,
      )

      // Override to manual route if STANDARD_RECALL_255 error occurred
      if (forceManualRoute) {
        res.locals.manualCaseSelection = true
        res.locals.forceManualRoute = true
      }

      res.locals.recallEligibility = routingResponse.eligibility
      res.locals.courtCases = routingResponse.casesToUse
      res.locals.smartOverrideApplied = routingResponse.smartOverrideApplied
      res.locals.wereCasesFilteredOut = routingResponse.wereCasesFilteredOut
      res.locals.routingResponse = routingResponse

      // Generate summarized sentence groups from the court cases
      const summarisedSentenceGroups = summariseRasCases(routingResponse.casesToUse)
      res.locals.summarisedSentenceGroups = summarisedSentenceGroups

      if (calculationResult && calculationResult.calculatedReleaseDates && routingResponse.casesToUse.length > 0) {
        const newCalc = calculationResult.calculatedReleaseDates
        res.locals.temporaryCalculation = newCalc
        res.locals.calcReqId = newCalc.calculationRequestId

        const sentencesFromRasCases = routingResponse.casesToUse.flatMap(caseItem => caseItem.sentences || [])

        const sentences = await this.getCrdsSentences(req, res)

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
      } else {
        // When calculation failed or manual route, use RAS sentences directly
        const sentencesFromRasCases = routingResponse.casesToUse.flatMap(caseItem => caseItem.sentences || [])
        res.locals.rasSentences = sentencesFromRasCases.map(sentence => ({
          ...sentence,
          dpsSentenceUuid: sentence.sentenceUuid,
        }))
        res.locals.crdsSentences = []
        res.locals.dpsSentenceIds = []
      }

      res.locals.existingAdjustments = existingAdjustments

      return super.configure(req, res, next)
    } catch (error) {
      logger.error(error)
      return next(error)
    }
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.ENTRYPOINT, res.locals.entrypoint)
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.RECALL_ELIGIBILITY, res.locals.recallEligibility)

    // Set manual route if STANDARD_RECALL_255 error occurred
    if (res.locals.forceManualRoute) {
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.MANUAL_CASE_SELECTION, true)
    }

    const { routingResponse } = res.locals
    if (routingResponse) {
      Object.entries(routingResponse.sessionUpdates).forEach(([key, value]) => {
        const sessionField = this.mapToSessionField(key)
        if (sessionField) {
          req.sessionModel.set(sessionField, value)
        }
      })

      Object.entries(routingResponse.localUpdates).forEach(([key, value]) => {
        res.locals[key] = value
      })
    }

    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.COURT_CASE_OPTIONS, res.locals.courtCases)
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.SENTENCES, res.locals.crdsSentences)
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.RAS_SENTENCES, res.locals.rasSentences)
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.TEMP_CALC, res.locals.temporaryCalculation)
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.BREAKDOWN, res.locals.breakdown)
    SessionManager.setSessionValue(
      req,
      SessionManager.SESSION_KEYS.EXISTING_ADJUSTMENTS,
      res.locals.existingAdjustments,
    )
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.DPS_SENTENCE_IDS, res.locals.dpsSentenceIds)
    SessionManager.setSessionValue(
      req,
      SessionManager.SESSION_KEYS.SUMMARISED_SENTENCES,
      res.locals.summarisedSentenceGroups,
    )

    return { ...locals }
  }

  /**
   * Map service field names to session model field names
   */
  private mapToSessionField(serviceFieldName: string): string | null {
    const fieldMap: Record<string, string> = {
      recallEligibility: SessionManager.SESSION_KEYS.RECALL_ELIGIBILITY,
      crdsErrors: SessionManager.SESSION_KEYS.CRDS_ERRORS,
      manualCaseSelection: SessionManager.SESSION_KEYS.MANUAL_CASE_SELECTION,
    }
    return fieldMap[serviceFieldName] || null
  }

  recallPossible(req: FormWizard.Request, res: Response) {
    // Check if we should go to manual route due to STANDARD_RECALL_255
    if (res.locals.forceManualRoute) {
      // We still return true to allow the recall, but the manual flag will route it correctly later
      return true
    }
    return getRecallRoute(req) && getRecallRoute(req) !== 'NOT_POSSIBLE'
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
