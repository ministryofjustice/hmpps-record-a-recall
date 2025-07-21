import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { min } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
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

export default class RevocationDateController extends RecallBaseController {
  private recallRoutingService: RecallRoutingService

  constructor(options: FormWizard.Controller.Options) {
    super(options)
    this.recallRoutingService = new RecallRoutingService()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  async validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, async errorsParam => {
      const validationErrors = { ...(errorsParam || {}) } as Record<string, FormWizard.Controller.Error>
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
          nomsId: req.sessionModel.get('prisoner.prisonerNumber'),
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
  }

  async successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    try {
      // Use cached routing response from validateFields
      const { routingResponse } = res.locals

      if (!routingResponse) {
        // Fallback if routing response not available (should not happen in normal flow)
        logger.warn('Routing response not found in res.locals, falling back to manual review')
        req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
        return super.successHandler(req, res, next)
      }

      req.sessionModel.set(
        sessionModelFields.INVALID_RECALL_TYPES,
        routingResponse.eligibilityDetails.invalidRecallTypes,
      )
      req.sessionModel.set(
        sessionModelFields.ELIGIBLE_SENTENCE_COUNT,
        routingResponse.eligibilityDetails.eligibleSentenceCount,
      )
      req.sessionModel.set(
        sessionModelFields.MANUAL_CASE_SELECTION,
        routingResponse.eligibilityDetails.hasNonSdsSentences,
      )

      res.locals.casesWithEligibleSentences = routingResponse.eligibilityDetails.eligibleSentenceCount
      res.locals.routingDecision = routingResponse.routing
      res.locals.nextSteps = routingResponse.nextSteps

      req.sessionModel.set('routingResponse', routingResponse)

      return super.successHandler(req, res, next)
    } catch (error) {
      logger.error('Error in recall routing:', error)
      return next(error)
    }
  }
}
