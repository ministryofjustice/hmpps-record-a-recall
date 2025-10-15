import { Request, Response } from 'express'
import { isBefore, isAfter, isEqual } from 'date-fns'
import _ from 'lodash'
import type { UAL } from 'models'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import { calculateUal } from '../../../utils/utils'
import { AdjustmentDto, ConflictingAdjustments } from '../../../@types/adjustmentsApi/adjustmentsApiTypes'
import logger from '../../../../logger'

export default class ReturnToCustodyDateControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ReturnToCustodyDateControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Detect if this is edit mode from URL path
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // Build back link based on mode
    let backLink: string
    if (isEditMode) {
      backLink = `/person/${nomisId}/edit-recall/${recallId}/edit-summary`
    } else if (isEditFromCheckYourAnswers) {
      backLink = `/person/${nomisId}/record-recall/check-your-answers`
    } else {
      backLink = `/person/${nomisId}/record-recall/revocation-date`
    }

    // Build cancel URL based on mode
    const cancelUrl = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`
      : `/person/${prisoner?.prisonerNumber || nomisId}/record-recall/confirm-cancel`

    // If not coming from a validation redirect, load from session
    if (!res.locals.formResponses) {
      const formResponses: Record<string, string | boolean> = {
        inPrisonAtRecall: sessionData?.inPrisonAtRecall,
      }

      // If returnToCustodyDate exists in session, split it into day/month/year parts for the form
      if (sessionData?.returnToCustodyDate) {
        const dateString = sessionData.returnToCustodyDate
        // Parse date string (expected format: yyyy-MM-dd)
        const dateParts = dateString.split('-')
        if (dateParts.length === 3) {
          const [year, month, day] = dateParts
          formResponses['returnToCustodyDate-year'] = year
          formResponses['returnToCustodyDate-month'] = month
          formResponses['returnToCustodyDate-day'] = day
        }
      }

      res.locals.formResponses = formResponses
    }

    res.render('pages/recall/v2/rtc-date', {
      prisoner,
      nomisId,
      isEditRecall: isEditMode,
      backLink,
      cancelUrl,
      revocationDate: sessionData?.revocationDate,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  // eslint-disable-next-line consistent-return
  static async post(req: Request, res: Response): Promise<void> {
    const { inPrisonAtRecall, returnToCustodyDate } = req.body
    const { nomisId, recallId } = res.locals
    const sessionData = ReturnToCustodyDateControllerV2.getSessionData(req)
    const isEditMode = req.originalUrl.includes('/edit-recall/')

    // Get revocation date from session
    const revocationDate = sessionData?.revocationDate
    if (!revocationDate) {
      logger.error('No revocation date found in session')
      const redirectUrl = isEditMode
        ? `/person/${nomisId}/edit-recall/${recallId}/revocation-date`
        : `/person/${nomisId}/record-recall/revocation-date`
      return res.redirect(redirectUrl)
    }

    // Additional validation for return to custody date
    const isInPrison = inPrisonAtRecall === true || inPrisonAtRecall === 'true'
    if (!isInPrison && returnToCustodyDate) {
      if (isBefore(new Date(returnToCustodyDate), new Date(revocationDate))) {
        const redirectUrl = isEditMode
          ? `/person/${nomisId}/edit-recall/${recallId}/rtc-date`
          : `/person/${nomisId}/record-recall/rtc-date`
        ReturnToCustodyDateControllerV2.setValidationError(
          req,
          res,
          'returnToCustodyDate',
          'Return to custody date must be on or after the recall date',
          redirectUrl,
        )
        // eslint-disable-next-line consistent-return
        return
      }
    }

    // Convert Date to string format for session storage (yyyy-MM-dd format)
    // The Zod schema returns a Date object, but we need to store it as a string
    // Use local date components to avoid timezone conversion issues
    let returnToCustodyDateString: string | null = null
    if (!isInPrison && returnToCustodyDate) {
      if (returnToCustodyDate instanceof Date) {
        const year = returnToCustodyDate.getFullYear()
        const month = String(returnToCustodyDate.getMonth() + 1).padStart(2, '0')
        const day = String(returnToCustodyDate.getDate()).padStart(2, '0')
        returnToCustodyDateString = `${year}-${month}-${day}`
      } else {
        returnToCustodyDateString = returnToCustodyDate
      }
    }

    // Process UAL calculations and conflicts
    const ual =
      !isInPrison && returnToCustodyDateString ? calculateUal(revocationDate, returnToCustodyDateString) : null
    const processedUalData = ual
      ? ReturnToCustodyDateControllerV2.processUalConflicts(req, ual, returnToCustodyDateString, sessionData)
      : null

    // Update session with form data and UAL information
    const sessionUpdate = {
      inPrisonAtRecall: isInPrison,
      returnToCustodyDate: returnToCustodyDateString,
      UAL: ual, // Store the calculated UAL
      ualToCreate: processedUalData?.ualToCreate,
      ualToEdit: processedUalData?.ualToEdit,
      hasMultipleOverlappingUalTypeRecall: processedUalData?.hasMultipleOverlappingUALTypeRecall,
      relevantAdjustment: processedUalData?.relevantAdjustments,
      incompatibleTypesAndMultipleConflictingAdjustments: processedUalData?.hasConflicts,
      conflictingAdjustments: processedUalData?.conflictingAdjustments,
    }

    await ReturnToCustodyDateControllerV2.updateSessionData(req, sessionUpdate)

    // Clear validation state before redirecting
    clearValidation(req)

    // Determine next path based on complex navigation logic
    const nextPath = await ReturnToCustodyDateControllerV2.determineNextPath(req, res)
    res.redirect(nextPath)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static processUalConflicts(req: Request, proposedUal: UAL, rtcDate: string, sessionData: any): any {
    const { nomisId, prisoner } = sessionData
    const prisonerDetails = prisoner || {}
    const existingAdjustments: AdjustmentDto[] = sessionData?.existingAdjustments || []

    // Filter adjustments to consider based on journey data
    const adjustmentsToConsider = ReturnToCustodyDateControllerV2.getAdjustmentsToConsider(
      sessionData,
      existingAdjustments,
    )

    // Check for UAL conflicts
    const hasNoRecallUalConflicts = ReturnToCustodyDateControllerV2.validateAgainstExistingRecallUalAdjustments(
      proposedUal,
      adjustmentsToConsider,
    )

    const hasNoOtherAdjustmentConflicts =
      ReturnToCustodyDateControllerV2.validateAgainstExistingNonRecallUalAdjustments(proposedUal, adjustmentsToConsider)

    const hasConflicts = !hasNoRecallUalConflicts.valid || !hasNoOtherAdjustmentConflicts.valid

    if (!hasConflicts) {
      const ualToSave: UAL = {
        ...proposedUal,
        nomisId,
        bookingId: prisonerDetails.bookingId,
      }

      const conflictingAdjustments = ReturnToCustodyDateControllerV2.identifyConflictingAdjustments(
        proposedUal,
        adjustmentsToConsider,
      )

      const allConflicting = [
        ...conflictingAdjustments.exact,
        ...conflictingAdjustments.overlap,
        ...conflictingAdjustments.within,
      ]

      const relevantAdjustments = allConflicting
        .filter(adj => ReturnToCustodyDateControllerV2.isRelevantAdjustment(adj).isRelevant)
        .filter((adj, index, self) => index === self.findIndex(t => t.id === adj.id))

      if (relevantAdjustments.length === 0) {
        if (Object.values(conflictingAdjustments).every(arr => arr.length === 0)) {
          // No conflicts - create new UAL
          return {
            ualToCreate: ualToSave,
            ualToEdit: null,
            hasConflicts: false,
            conflictingAdjustments,
          }
        }
        if (conflictingAdjustments.exact.length === 1 || conflictingAdjustments.within.length === 1) {
          // Edit existing UAL
          const existingAdjustment = _.first([...conflictingAdjustments.exact, ...conflictingAdjustments.within])
          const updatedUal: UAL = {
            adjustmentId: existingAdjustment.id,
            bookingId: existingAdjustment.bookingId,
            firstDay: proposedUal.firstDay,
            lastDay: proposedUal.lastDay,
            nomisId: existingAdjustment.person,
          }
          return {
            ualToCreate: null,
            ualToEdit: updatedUal,
            hasConflicts: false,
            conflictingAdjustments,
          }
        }
        // Overlapping adjustment - create new and edit existing
        const existingAdj = _.first(conflictingAdjustments.overlap)
        const updatedUal: UAL = {
          adjustmentId: existingAdj.id,
          bookingId: existingAdj.bookingId,
          firstDay: new Date(rtcDate),
          lastDay: existingAdj.toDate,
          nomisId: existingAdj.person,
        }
        return {
          ualToCreate: ualToSave,
          ualToEdit: updatedUal,
          hasConflicts: false,
          conflictingAdjustments,
        }
      }
    }

    return {
      hasConflicts,
      hasMultipleOverlappingUALTypeRecall: hasNoRecallUalConflicts.hasMultiple,
      relevantAdjustments: hasNoOtherAdjustmentConflicts.relevantAdjustments,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getAdjustmentsToConsider(journeyData: any, allAdjustments: AdjustmentDto[]): AdjustmentDto[] {
    // Filter adjustments based on journey data logic
    // This is a simplified version - the actual logic may be more complex
    return allAdjustments
  }

  private static validateAgainstExistingRecallUalAdjustments(
    proposedUal: UAL,
    existingAdjustments: AdjustmentDto[],
  ): { valid: boolean; hasMultiple: boolean } {
    const conflictingRecallUALAdjustments = existingAdjustments.filter(adjustment => {
      // Guard against null/undefined dates
      if (!adjustment.fromDate || !adjustment.toDate || !proposedUal?.firstDay || !proposedUal?.lastDay) {
        return false
      }

      return (
        !ReturnToCustodyDateControllerV2.isRelevantAdjustment(adjustment).isRelevant &&
        isBefore(new Date(adjustment.fromDate), proposedUal.lastDay) &&
        isAfter(new Date(adjustment.toDate), proposedUal.firstDay)
      )
    })

    if (conflictingRecallUALAdjustments.length === 1) {
      return { valid: true, hasMultiple: false }
    }
    if (conflictingRecallUALAdjustments.length > 1) {
      return { valid: false, hasMultiple: true }
    }
    return { valid: true, hasMultiple: false }
  }

  private static validateAgainstExistingNonRecallUalAdjustments(
    proposedUal: UAL,
    existingAdjustments: AdjustmentDto[],
  ): { valid: boolean; relevantAdjustments: AdjustmentDto[] } {
    const conflictingNonRecallUALAdjustments = existingAdjustments.filter(adjustment => {
      // Guard against null/undefined dates
      if (!adjustment.fromDate || !adjustment.toDate || !proposedUal?.firstDay || !proposedUal?.lastDay) {
        return false
      }

      return (
        ReturnToCustodyDateControllerV2.isRelevantAdjustment(adjustment).isRelevant &&
        isBefore(new Date(adjustment.fromDate), proposedUal.lastDay) &&
        isAfter(new Date(adjustment.toDate), proposedUal.firstDay)
      )
    })

    if (conflictingNonRecallUALAdjustments.length > 0) {
      return { valid: false, relevantAdjustments: conflictingNonRecallUALAdjustments }
    }
    return { valid: true, relevantAdjustments: [] }
  }

  private static isRelevantAdjustment(adjustment: AdjustmentDto): {
    isRelevant: boolean
    type?: string
    ualType?: string
  } {
    if (adjustment.adjustmentType === 'REMAND') {
      return { isRelevant: true, type: 'REMAND' }
    }
    if (adjustment.adjustmentType === 'LAWFULLY_AT_LARGE') {
      return { isRelevant: true, type: 'LAWFULLY_AT_LARGE' }
    }

    if (adjustment.adjustmentType === 'UNLAWFULLY_AT_LARGE') {
      const ualType = adjustment.unlawfullyAtLarge?.type

      if (!ualType) {
        return { isRelevant: true, type: 'UAL' }
      }
      if (ualType !== 'RECALL') {
        return { isRelevant: true, type: 'UAL', ualType }
      }
    }

    return { isRelevant: false }
  }

  private static identifyConflictingAdjustments(
    proposedUal: UAL,
    existingAdjustments?: AdjustmentDto[],
  ): ConflictingAdjustments {
    if (!existingAdjustments || existingAdjustments.length === 0) {
      return { exact: [], overlap: [], within: [] }
    }

    return {
      exact: existingAdjustments.filter(
        adj => isEqual(adj.fromDate, proposedUal.firstDay) && isEqual(adj.toDate, proposedUal.lastDay),
      ),
      within: existingAdjustments.filter(adj => {
        const startsSame = isEqual(adj.fromDate, proposedUal.firstDay)
        const endsSame = isEqual(adj.toDate, proposedUal.lastDay)
        const startsAfter = isAfter(adj.fromDate, proposedUal.firstDay)
        const endsBefore = isBefore(adj.toDate, proposedUal.lastDay)
        return (startsSame && endsBefore) || (startsAfter && endsBefore) || (startsAfter && endsSame)
      }),
      overlap: existingAdjustments.filter(
        adj => isBefore(adj.fromDate, proposedUal.lastDay) && isAfter(adj.toDate, proposedUal.firstDay),
      ),
    }
  }

  private static async determineNextPath(req: Request, res: Response): Promise<string> {
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')
    const { nomisId, recallId } = res.locals
    const sessionData = ReturnToCustodyDateControllerV2.getSessionData(req)

    // Mark that this step was edited
    if (isEditMode || isEditFromCheckYourAnswers) {
      await ReturnToCustodyDateControllerV2.updateSessionData(req, {
        lastEditedStep: 'rtc-date',
      })
    }

    // If editing from check-your-answers, return there
    if (isEditFromCheckYourAnswers) {
      return `/person/${nomisId}/record-recall/check-your-answers`
    }

    // Set base path based on mode
    const basePath = isEditMode ? `/person/${nomisId}/edit-recall/${recallId}` : `/person/${nomisId}/record-recall`

    // navigation logic from steps.ts lines 53-65
    // Check for multiple conflicting adjustments
    if (ReturnToCustodyDateControllerV2.hasMultipleConflicting(sessionData)) {
      return `${basePath}/conflicting-adjustments-interrupt`
    }

    // Check if manual case selection is required
    if (ReturnToCustodyDateControllerV2.isManualCaseSelection(sessionData)) {
      return `${basePath}/manual-recall-intercept`
    }

    // Check if no eligible sentences
    if (ReturnToCustodyDateControllerV2.getEligibleSentenceCount(sessionData) === 0) {
      return `${basePath}/no-sentences-interrupt`
    }

    // Default: go to check-sentences
    return `${basePath}/check-sentences`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static hasMultipleConflicting(sessionData: any): boolean {
    return (
      sessionData?.incompatibleTypesAndMultipleConflictingAdjustments === true ||
      sessionData?.hasMultipleOverlappingUALTypeRecall === true
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isManualCaseSelection(sessionData: any): boolean {
    return sessionData?.manualCaseSelection === true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getEligibleSentenceCount(sessionData: any): number {
    return sessionData?.eligibleSentenceCount || 0
  }
}
