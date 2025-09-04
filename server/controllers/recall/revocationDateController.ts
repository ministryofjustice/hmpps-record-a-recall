import { NextFunction, Response } from 'express'
import { min } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { ExtendedRequest } from '../base/ExpressBaseController'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import getJourneyDataFromRequest, {
  getCourtCaseOptions,
  getCrdsSentences,
  getExistingAdjustments,
  sessionModelFields,
} from '../../helpers/formWizardHelper'
import { RecallRoutingService } from '../../services/RecallRoutingService'
import logger from '../../../logger'
import { getSessionValue, setSessionValue } from '../../helpers/sessionHelper'

export default class RevocationDateController extends RecallBaseController {
  private recallRoutingService: RecallRoutingService

  constructor(options?: unknown) {
    super(options)
    this.recallRoutingService = new RecallRoutingService()
  }

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  validateFields(
    req: ExtendedRequest,
    res: Response,
    callback?: (errors: Record<string, unknown>) => void,
  ): Record<string, unknown> | void {
    if (!callback) {
      return {}
    }
    super.validateFields(req as ExtendedRequest, res as Response, async errorsParam => {
      const validationErrors = { ...(errorsParam || {}) } as Record<string, unknown>
      const { values } = req.form
      const sentences = getCrdsSentences(req) || []

      if (sentences.length) {
        const earliestSentenceDate = min(sentences.map(s => new Date(s.sentenceDate)))
        if (new Date(values.revocationDate as string) < earliestSentenceDate) {
          validationErrors.revocationDate = this.formError('revocationDate', 'mustBeAfterEarliestSentenceDate')
        }
      }

      try {
        const revocationDate = new Date(values.revocationDate as string)
        const courtCases = getCourtCaseOptions(req).filter((c: CourtCase) => c.status !== 'DRAFT')
        const adjustments = getExistingAdjustments(req)
        const existingRecalls = res.locals.recalls || []
        const journeyData = getJourneyDataFromRequest(req)

        const routingResponse = await this.recallRoutingService.routeRecall({
          nomsId: getSessionValue(req, 'prisoner.prisonerNumber') as string,
          revocationDate,
          courtCases,
          adjustments,
          existingRecalls,
          calculationBreakdown: null,
          validationMessages: [],
          journeyData,
        })

        // Store routing response for use in successHandler
        res.locals.routingResponse = routingResponse

        // Add validation errors from routing service
        routingResponse.validationMessages.forEach(msg => {
          if (msg.code === 'ADJUSTMENT_FUTURE_DATED_UAL') {
            validationErrors.revocationDate = this.formError('revocationDate', 'cannotBeWithinAdjustmentPeriod')
          } else if (msg.code === 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER') {
            validationErrors.revocationDate = this.formError('revocationDate', 'revocationDateOverlapsFixedTermRecall')
          } else if (msg.code === 'CONCURRENT_CONSECUTIVE_SENTENCES_DURATION') {
            validationErrors.revocationDate = this.formError('revocationDate', 'revocationDateOnOrBeforeExistingRecall')
          } else {
            // For other validation codes, use a generic error message
            logger.warn(`Unhandled validation code: ${msg.code}`)
          }
        })
      } catch (error) {
        // If routing service fails, fall back to basic validation
        logger.error('Routing service validation failed:', error)
      }

      callback(validationErrors)
    })
    return undefined
  }

  async successHandler(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
      // Use cached routing response from validateFields
      const { routingResponse } = res.locals

      if (!routingResponse) {
        // Fallback if routing response not available (should not happen in normal flow)
        logger.warn('Routing response not found in res.locals, falling back to manual review')
        setSessionValue(req, sessionModelFields.MANUAL_CASE_SELECTION, true)
        return super.successHandler(req, res, next)
      }

      setSessionValue(
        req,
        sessionModelFields.INVALID_RECALL_TYPES,
        routingResponse.eligibilityDetails.invalidRecallTypes,
      )
      setSessionValue(
        req,
        sessionModelFields.ELIGIBLE_SENTENCE_COUNT,
        routingResponse.eligibilityDetails.eligibleSentenceCount,
      )
      setSessionValue(
        req,
        sessionModelFields.MANUAL_CASE_SELECTION,
        routingResponse.eligibilityDetails.hasNonSdsSentences,
      )

      res.locals.casesWithEligibleSentences = routingResponse.eligibilityDetails.eligibleSentenceCount
      res.locals.routingDecision = routingResponse.routing
      res.locals.nextSteps = routingResponse.nextSteps

      setSessionValue(req, 'routingResponse', routingResponse)

      return super.successHandler(req, res, next)
    } catch (error) {
      logger.error('Error in recall routing:', error)
      return next(error)
    }
  }
}
