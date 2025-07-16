import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import {
  RecordARecallCalculationResult,
  ValidationMessage,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { getRecallRoute, sessionModelFields } from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../../@types/nomisMappingApi/nomisMappingApiTypes'
import { RecallRoutingService } from '../../services/RecallRoutingService'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'

export default class CheckPossibleController extends RecallBaseController {
  private recallRoutingService: RecallRoutingService

  constructor(options: FormWizard.Controller.Options) {
    super(options)
    this.recallRoutingService = new RecallRoutingService()
  }

  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      // Get calculation result and validation messages
      const calculationResult: RecordARecallCalculationResult =
        await req.services.calculationService.getTemporaryCalculation(nomisId, username)

      const errors: ValidationMessage[] = calculationResult.validationMessages
      res.locals.validationResponse = errors

      // Get breakdown immediately if we have calculation results
      let breakdown = null
      if (calculationResult.calculatedReleaseDates) {
        const tempCalcReqId = calculationResult.calculatedReleaseDates.calculationRequestId
        breakdown = await req.services.calculationService.getCalculationBreakdown(tempCalcReqId, username)
      }

      // Get court cases and adjustments in parallel
      const [cases, existingAdjustments] = await Promise.all([
        req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username),
        req.services.adjustmentsService.searchUal(nomisId, username).catch((e: Error): AdjustmentDto[] => {
          logger.error(e.message)
          return []
        }),
      ])

      // Use routing service for smart filtering and routing decisions
      const routingResponse = await this.recallRoutingService.routeRecallWithSmartFiltering(
        nomisId,
        cases,
        existingAdjustments,
        [], // No existing recalls at this stage
        breakdown,
        errors,
      )

      res.locals.recallEligibility = routingResponse.eligibility
      res.locals.courtCases = routingResponse.casesToUse
      res.locals.smartOverrideApplied = routingResponse.smartOverrideApplied
      res.locals.wereCasesFilteredOut = routingResponse.wereCasesFilteredOut
      res.locals.routingResponse = routingResponse // Store for locals method

      // Generate summarized sentence groups from the court cases
      const summarisedSentenceGroups = summariseRasCases(routingResponse.casesToUse)
      res.locals.summarisedSentenceGroups = summarisedSentenceGroups

      if (calculationResult.calculatedReleaseDates && routingResponse.casesToUse.length > 0) {
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

    req.sessionModel.set(sessionModelFields.ENTRYPOINT, res.locals.entrypoint)
    req.sessionModel.set(sessionModelFields.RECALL_ELIGIBILITY, res.locals.recallEligibility)

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

    req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, res.locals.courtCases)
    req.sessionModel.set(sessionModelFields.SENTENCES, res.locals.crdsSentences)
    req.sessionModel.set(sessionModelFields.RAS_SENTENCES, res.locals.rasSentences)
    req.sessionModel.set(sessionModelFields.TEMP_CALC, res.locals.temporaryCalculation)
    req.sessionModel.set(sessionModelFields.BREAKDOWN, res.locals.breakdown)
    req.sessionModel.set(sessionModelFields.EXISTING_ADJUSTMENTS, res.locals.existingAdjustments)
    req.sessionModel.set(sessionModelFields.DPS_SENTENCE_IDS, res.locals.dpsSentenceIds)
    req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, res.locals.summarisedSentenceGroups)

    return { ...locals }
  }

  /**
   * Map service field names to session model field names
   */
  private mapToSessionField(serviceFieldName: string): string | null {
    const fieldMap: Record<string, string> = {
      recallEligibility: sessionModelFields.RECALL_ELIGIBILITY,
      crdsErrors: sessionModelFields.CRDS_ERRORS,
      manualCaseSelection: sessionModelFields.MANUAL_CASE_SELECTION,
    }
    return fieldMap[serviceFieldName] || null
  }

  recallPossible(req: FormWizard.Request, res: Response) {
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
