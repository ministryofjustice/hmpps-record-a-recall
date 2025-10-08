import { Request, Response } from 'express'
import { min } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import BaseController from '../../base/BaseController'
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

    // Detect if this is edit mode from URL path
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // Build back link based on mode
    let backLink: string
    if (isEditMode) {
      backLink = `/person/${nomisId}/edit-recall-v2/${recallId}/edit-summary`
    } else if (isEditFromCheckYourAnswers) {
      backLink = `/person/${nomisId}/record-recall-v2/check-your-answers`
    } else {
      backLink = `/person/${prisoner?.prisonerNumber || nomisId}`
    }

    // Build cancel URL based on mode
    const cancelUrl = isEditMode
      ? `/person/${nomisId}/edit-recall-v2/${recallId}/confirm-cancel`
      : `/person/${prisoner?.prisonerNumber || nomisId}/record-recall-v2/confirm-cancel`

    // If not coming from a validation redirect, load from session
    if (!res.locals.formResponses) {
      // Parse the date string from session to populate the form fields
      let dateParts = {}
      if (sessionData?.revocationDate) {
        // Date is stored as 'yyyy-MM-dd' string in session
        const dateStr = sessionData.revocationDate
        const date = new Date(dateStr)
        if (!Number.isNaN(date.getTime())) {
          // Need to account for timezone - use UTC to avoid date shifts
          const utcDate = new Date(`${dateStr}T00:00:00Z`)
          dateParts = {
            'revocationDate-day': utcDate.getUTCDate().toString(),
            'revocationDate-month': (utcDate.getUTCMonth() + 1).toString(), // Month is 0-indexed
            'revocationDate-year': utcDate.getUTCFullYear().toString(),
          }
        }
      }
      res.locals.formResponses = dateParts
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
      isEditRecall: isEditMode,
      backLink,
      cancelUrl,
      earliestSentenceDate,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { revocationDate } = req.body
    const { nomisId, recallId } = res.locals
    const sessionData = RevocationDateControllerV2.getSessionData(req)
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')

    // Debug logging to see what's being submitted
    logger.info('Revocation date POST received:', {
      revocationDate,
      revocationDateType: typeof revocationDate,
      reqBodyFull: req.body,
      isEditMode,
    })

    // Get prisoner data from session or res.locals if needed for future use

    // Check if revocationDate is valid
    if (!revocationDate) {
      logger.error('Revocation date is missing or null after validation')
      const redirectUrl = isEditMode
        ? `/person/${nomisId}/edit-recall-v2/${recallId}/revocation-date`
        : `/person/${nomisId}/record-recall-v2/revocation-date`
      res.redirect(redirectUrl)
      return
    }

    // Ensure we have a valid Date object
    const revocationDateObj = revocationDate instanceof Date ? revocationDate : new Date(revocationDate)
    if (Number.isNaN(revocationDateObj.getTime())) {
      logger.error(`Invalid revocation date received: ${revocationDate}`)
      const redirectUrl = isEditMode
        ? `/person/${nomisId}/edit-recall-v2/${recallId}/revocation-date`
        : `/person/${nomisId}/record-recall-v2/revocation-date`
      RevocationDateControllerV2.setValidationError(
        req,
        res,
        'revocationDate',
        'Enter a valid recall date',
        redirectUrl,
      )
      return
    }

    try {
      // Format date as string to match API expectations
      // Use local date components to avoid timezone conversion issues
      const year = revocationDateObj.getFullYear()
      const month = String(revocationDateObj.getMonth() + 1).padStart(2, '0')
      const day = String(revocationDateObj.getDate()).padStart(2, '0')
      const revocationDateString = `${year}-${month}-${day}` // yyyy-MM-dd format

      // If in edit mode, skip routing validation and just update the date
      if (isEditMode) {
        const beforeUpdate = RevocationDateControllerV2.getSessionData(req)
        logger.info(`Edit mode - BEFORE update:`, {
          currentRevocationDate: beforeUpdate?.revocationDate,
          storedRevocationDate: beforeUpdate?.storedRecall?.revocationDate,
        })

        RevocationDateControllerV2.updateSessionData(req, {
          revocationDate: revocationDateString,
          lastEditedStep: 'revocation-date',
        })

        const afterUpdate = RevocationDateControllerV2.getSessionData(req)
        logger.info(`Edit mode - AFTER update:`, {
          newRevocationDate: afterUpdate?.revocationDate,
          formattedDate: revocationDateString,
          updateSuccessful: afterUpdate?.revocationDate === revocationDateString,
        })

        // Clear validation and redirect back to edit-summary
        clearValidation(req)
        res.redirect(`/person/${nomisId}/edit-recall-v2/${recallId}/edit-summary`)
        return
      }

      // Get required data from session for new recall flow
      const courtCases = (sessionData?.courtCaseOptions || []).filter((c: CourtCase) => c.status !== 'DRAFT')
      const adjustments = sessionData?.existingAdjustments || []
      const existingRecalls = res.locals.recalls || []
      const crdsSentences = sessionData?.crdsSentences || []

      // Additional validation against earliest sentence date
      if (crdsSentences.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const earliestSentenceDate = min(crdsSentences.map((s: any) => new Date(s.sentenceDate)))
        if (revocationDateObj < earliestSentenceDate) {
          const redirectUrl = `/person/${nomisId}/record-recall-v2/revocation-date`
          RevocationDateControllerV2.setValidationError(
            req,
            res,
            'revocationDate',
            'Recall date must be after the earliest sentence date',
            redirectUrl,
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
        const redirectUrl = `/person/${nomisId}/record-recall-v2/revocation-date`
        RevocationDateControllerV2.setValidationError(req, res, 'revocationDate', errorMessage, redirectUrl)
        return
      }

      // Store routing response data in session
      logger.info(`Storing revocation date in session for ${nomisId}:`, {
        originalDate: revocationDateObj,
        formattedDate: revocationDateString,
        isEditMode: false,
      })

      RevocationDateControllerV2.updateSessionData(req, {
        revocationDate: revocationDateString,
        invalidRecallTypes: routingResponse.eligibilityDetails.invalidRecallTypes,
        eligibleSentenceCount: routingResponse.eligibilityDetails.eligibleSentenceCount,
        manualCaseSelection: routingResponse.eligibilityDetails.hasNonSdsSentences,
        routingResponse,
      })

      // Clear validation state before redirecting
      clearValidation(req)

      // Check if editing from check-your-answers page
      const isEditFromCheckYourAnswers = req.path.endsWith('/edit')
      if (isEditFromCheckYourAnswers) {
        // Editing from check-your-answers page - go back there
        res.redirect(`/person/${nomisId}/record-recall-v2/check-your-answers`)
        return
      }

      // Normal flow - navigate to next step (rtc-date)
      res.redirect(`/person/${nomisId}/record-recall-v2/rtc-date`)
    } catch (error) {
      logger.error('Error in revocation date controller:', error)

      // In edit mode, still save the date and return to edit-summary
      if (isEditMode) {
        const year = revocationDateObj.getFullYear()
        const month = String(revocationDateObj.getMonth() + 1).padStart(2, '0')
        const day = String(revocationDateObj.getDate()).padStart(2, '0')
        const revocationDateString = `${year}-${month}-${day}` // yyyy-MM-dd format
        RevocationDateControllerV2.updateSessionData(req, {
          revocationDate: revocationDateString,
          lastEditedStep: 'revocation-date',
        })
        clearValidation(req)
        res.redirect(`/person/${nomisId}/edit-recall-v2/${recallId}/edit-summary`)
        return
      }

      // Fall back to manual review on routing service error for new recalls
      logger.warn('Routing service failed, falling back to manual review')
      const year = revocationDateObj.getFullYear()
      const month = String(revocationDateObj.getMonth() + 1).padStart(2, '0')
      const day = String(revocationDateObj.getDate()).padStart(2, '0')
      const revocationDateString = `${year}-${month}-${day}` // yyyy-MM-dd format
      RevocationDateControllerV2.updateSessionData(req, {
        revocationDate: revocationDateString,
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
