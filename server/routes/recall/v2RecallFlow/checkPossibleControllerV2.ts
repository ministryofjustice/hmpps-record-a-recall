import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import {
  RecordARecallCalculationResult,
  ValidationMessage,
} from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../../logger'
import BaseController from '../../../controllers/base/BaseController'
import { SessionManager } from '../../../services/sessionManager'
import { AdjustmentDto } from '../../../@types/adjustmentsApi/adjustmentsApiTypes'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../../../@types/nomisMappingApi/nomisMappingApiTypes'
import { RecallRoutingService } from '../../../services/RecallRoutingService'
import { summariseRasCases } from '../../../utils/CaseSentenceSummariser'
import { COURT_MESSAGES } from '../../../utils/courtConstants'
import { RecallEligibility } from '../../../@types/recallEligibility'

export default class CheckPossibleControllerV2 extends BaseController {
  private static recallRoutingService = new RecallRoutingService()

  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const routingResponse = await CheckPossibleControllerV2.recallRoutingService.routeRecallWithSmartFiltering(
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

        const sentences = await CheckPossibleControllerV2.getCrdsSentences(req, res)

        const nomisSentenceInformation = sentences.map(sentence => {
          return {
            nomisSentenceSequence: sentence.sentenceSequence,
            nomisBookingId: sentence.bookingId,
          }
        })

        const dpsSentenceSequenceIds = await CheckPossibleControllerV2.getNomisToDpsMapping(
          req,
          nomisSentenceInformation,
        )

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

      // Store data in session
      CheckPossibleControllerV2.storeSessionData(req, res)

      // Determine redirect path
      const nextPath = CheckPossibleControllerV2.determineNextPath(res)
      return res.redirect(nextPath)
    } catch (error) {
      logger.error(error)
      return next(error)
    }
  }

  private static storeSessionData(req: Request, res: Response): void {
    // Store all the calculated data in session
    // Use BaseController's helper methods where possible
    CheckPossibleControllerV2.updateSessionData(req, { entrypoint: res.locals.entrypoint })
    CheckPossibleControllerV2.updateSessionData(req, { recallEligibility: res.locals.recallEligibility })

    // Set manual route if STANDARD_RECALL_255 error occurred
    if (res.locals.forceManualRoute) {
      CheckPossibleControllerV2.updateSessionData(req, { manualCaseSelection: true })
    }

    const { routingResponse } = res.locals
    if (routingResponse) {
      // Store session updates from routing response
      Object.entries(routingResponse.sessionUpdates).forEach(([key, value]) => {
        const sessionField = CheckPossibleControllerV2.mapToSessionField(key)
        if (sessionField) {
          // Use SessionManager directly for dynamic field names
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          SessionManager.setSessionValue(req as any, sessionField, value)
        }
      })

      // Note: localUpdates are already set in res.locals
    }

    // Store remaining session data
    CheckPossibleControllerV2.updateSessionData(req, {
      courtCaseOptions: res.locals.courtCases,
      crdsSentences: res.locals.crdsSentences,
      rasSentences: res.locals.rasSentences,
      temporaryCalculation: res.locals.temporaryCalculation,
      breakdown: res.locals.breakdown,
      existingAdjustments: res.locals.existingAdjustments,
      dpsSentenceIds: res.locals.dpsSentenceIds,
      summarisedSentenceGroups: res.locals.summarisedSentenceGroups,
    })
  }

  /**
   * Map service field names to session model field names
   */
  private static mapToSessionField(serviceFieldName: string): string | null {
    const fieldMap: Record<string, string> = {
      recallEligibility: SessionManager.SESSION_KEYS.RECALL_ELIGIBILITY,
      crdsErrors: SessionManager.SESSION_KEYS.CRDS_ERRORS,
      manualCaseSelection: SessionManager.SESSION_KEYS.MANUAL_CASE_SELECTION,
    }
    return fieldMap[serviceFieldName] || null
  }

  private static determineNextPath(res: Response): string {
    const basePath = `/person/${res.locals.nomisId}/record-recall-v2`

    // Check if recall is possible
    const recallPossible = CheckPossibleControllerV2.isRecallPossible(res)

    if (!recallPossible) {
      return `${basePath}/not-possible`
    }

    // If recall is possible, go to revocation date (now using V2 route)
    return `${basePath}/revocation-date`
  }

  private static isRecallPossible(res: Response): boolean {
    // Check if we should go to manual route due to STANDARD_RECALL_255
    if (res.locals.forceManualRoute) {
      // We still return true to allow the recall, but the manual flag will route it correctly later
      return true
    }

    const recallEligibility = res.locals.recallEligibility as RecallEligibility
    return recallEligibility?.recallRoute && recallEligibility.recallRoute !== 'NOT_POSSIBLE'
  }

  private static async getCrdsSentences(req: Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getSentencesAndReleaseDates(calcReqId, username)
  }

  private static async getNomisToDpsMapping(
    req: Request,
    nomisSentenceInformation: NomisSentenceId[],
  ): Promise<NomisDpsSentenceMapping[]> {
    return req.services.nomisMappingService.getNomisToDpsMappingLookup(nomisSentenceInformation, req.user.username)
  }
}
