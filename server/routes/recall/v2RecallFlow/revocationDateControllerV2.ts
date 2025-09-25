import { Request, Response } from 'express'
import { min } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import BaseController from '../../../controllers/base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import { RecallRoutingService } from '../../../services/RecallRoutingService'
import logger from '../../../../logger'

export default class RevocationDateControllerV2 extends BaseController {
  private static recallRoutingService = new RecallRoutingService()

  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = RevocationDateControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if this is an edit recall flow
    const isEditRecall = !!recallId

    // Build back link
    const backLink = `/person/${prisoner?.prisonerNumber || nomisId}${isEditRecall ? `/recall/${recallId}/edit/edit-summary` : ''}`

    // Build cancel URL
    const cancelUrl = `/person/${prisoner?.prisonerNumber || nomisId}/recall/confirm-cancel`

    // If not coming from a validation redirect, load from session
    if (!res.locals.formResponses) {
      res.locals.formResponses = {
        revocationDate: sessionData?.revocationDate,
      }
    }

    // Get earliest sentence date for validation display (if needed)
    const crdsSentences = sessionData?.crdsSentences || []
    let earliestSentenceDate = null
    if (crdsSentences.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      earliestSentenceDate = min(crdsSentences.map((s: any) => new Date(s.sentenceDate)))
    }

    res.render('pages/recall/v2/revocation-date', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      earliestSentenceDate,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { revocationDate } = req.body
    const { nomisId } = res.locals
    const sessionData = RevocationDateControllerV2.getSessionData(req)

    // Get prisoner data from session or res.locals if needed for future use

    // Check if revocationDate is valid
    if (!revocationDate) {
      logger.error('Revocation date is missing or null after validation')
      res.redirect(`/person/${nomisId}/record-recall-v2/revocation-date`)
      return
    }

    // Ensure we have a valid Date object
    const revocationDateObj = revocationDate instanceof Date ? revocationDate : new Date(revocationDate)
    if (Number.isNaN(revocationDateObj.getTime())) {
      logger.error(`Invalid revocation date received: ${revocationDate}`)
      RevocationDateControllerV2.setValidationError(
        req,
        res,
        'revocationDate',
        'Enter a valid recall date',
        `/person/${nomisId}/record-recall-v2/revocation-date`,
      )
      return
    }

    try {
      // Get required data from session
      const courtCases = (sessionData?.courtCaseOptions || []).filter((c: CourtCase) => c.status !== 'DRAFT')
      const adjustments = sessionData?.existingAdjustments || []
      const existingRecalls = res.locals.recalls || []
      const crdsSentences = sessionData?.crdsSentences || []

      // Additional validation against earliest sentence date
      if (crdsSentences.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const earliestSentenceDate = min(crdsSentences.map((s: any) => new Date(s.sentenceDate)))
        if (revocationDateObj < earliestSentenceDate) {
          RevocationDateControllerV2.setValidationError(
            req,
            res,
            'revocationDate',
            'Recall date must be after the earliest sentence date',
            `/person/${nomisId}/record-recall-v2/revocation-date`,
          )
          return
        }
      }

      // Create journey data object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const journeyData: any = {
        nomisId,
        revocationDate: revocationDateObj,
        returnToCustodyDate: sessionData?.returnToCustodyDate,
        inPrisonAtRecall: sessionData?.inPrisonAtRecall,
        manualCaseSelection: sessionData?.manualCaseSelection === true,
        recallType: sessionData?.recallType,
        courtCaseCount: sessionData?.courtCaseCount || 0,
        eligibleSentenceCount: sessionData?.eligibleSentenceCount || 0,
        isEdit: sessionData?.isEdit || false,
      }

      // Use routing service to validate the recall
      const routingResponse = await RevocationDateControllerV2.recallRoutingService.routeRecall({
        nomsId: nomisId,
        revocationDate: revocationDateObj,
        courtCases,
        adjustments,
        existingRecalls,
        calculationBreakdown: sessionData?.breakdown || null,
        validationMessages: [],
        journeyData,
      })

      // Check for validation messages from routing service
      if (routingResponse.validationMessages && routingResponse.validationMessages.length > 0) {
        const errorMessage = RevocationDateControllerV2.mapRoutingValidationError(
          routingResponse.validationMessages[0].code,
        )
        RevocationDateControllerV2.setValidationError(
          req,
          res,
          'revocationDate',
          errorMessage,
          `/person/${nomisId}/record-recall-v2/revocation-date`,
        )
        return
      }

      // Store routing response data in session
      RevocationDateControllerV2.updateSessionData(req, {
        revocationDate: revocationDateObj,
        invalidRecallTypes: routingResponse.eligibilityDetails.invalidRecallTypes,
        eligibleSentenceCount: routingResponse.eligibilityDetails.eligibleSentenceCount,
        manualCaseSelection: routingResponse.eligibilityDetails.hasNonSdsSentences,
        routingResponse,
      })

      // Clear validation state before redirecting
      clearValidation(req)

      // Navigate to next step (rtc-date)
      res.redirect(`/person/${nomisId}/record-recall-v2/rtc-date`)
    } catch (error) {
      logger.error('Error in revocation date controller:', error)

      // Fall back to manual review on routing service error
      logger.warn('Routing service failed, falling back to manual review')
      RevocationDateControllerV2.updateSessionData(req, {
        revocationDate: revocationDateObj,
        manualCaseSelection: true,
      })

      // Clear validation and proceed
      clearValidation(req)
      res.redirect(`/person/${nomisId}/record-recall-v2/rtc-date`)
    }
  }

  private static mapRoutingValidationError(code: string): string {
    switch (code) {
      case 'ADJUSTMENT_FUTURE_DATED_UAL':
        return 'Recall date cannot be within an adjustment period'
      case 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER':
        return 'Recall date overlaps with a fixed term recall'
      case 'CONCURRENT_CONSECUTIVE_SENTENCES_DURATION':
        return 'Recall date is on or before an existing recall'
      default:
        logger.warn(`Unhandled validation code: ${code}`)
        return 'The recall date is not valid for this person'
    }
  }
}
