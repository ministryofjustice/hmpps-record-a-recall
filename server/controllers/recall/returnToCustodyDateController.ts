import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, isEqual } from 'date-fns'
import _ from 'lodash'
import type { UAL } from 'models'
import RecallBaseController from './recallBaseController'
import { SessionManager } from '../../services/sessionManager'
import { calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getAdjustmentsToConsiderForValidation,
  getExistingAdjustments,
  getPrisoner,
  getRevocationDate,
  RecallJourneyData,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto, ConflictingAdjustments } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class ReturnToCustodyDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const { prisoner } = res.locals
    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : '/record-recall/revocation-date'}`
    return { ...locals, backLink }
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const revocationDate = getRevocationDate(req)

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false') {
        if (isBefore(values.returnToCustodyDate as string, revocationDate)) {
          validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRevDate')
        }
      }
      callback({ ...errors, ...validationErrors })
    })
  }

  isRelevantAdjustment(adjustment: AdjustmentDto): { isRelevant: boolean; type?: string; ualType?: string } {
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

  identifyConflictingAdjustments(proposedUal: UAL, existingAdjustments?: AdjustmentDto[]): ConflictingAdjustments {
    if (!existingAdjustments || existingAdjustments.length === 0) {
      return { exact: [], overlap: [], within: [] }
    }

    return {
      exact: this.getExactMatches(existingAdjustments, proposedUal),
      within: this.getAdjustmentsWithinProposed(existingAdjustments, proposedUal),
      overlap: this.getOverlappingAdjustments(existingAdjustments, proposedUal),
    }
  }

  private getExactMatches(adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] {
    return adjustments.filter(adj => isEqual(adj.fromDate, proposed.firstDay) && isEqual(adj.toDate, proposed.lastDay))
  }

  private getAdjustmentsWithinProposed(adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] {
    return adjustments.filter(adj => {
      const startsSame = isEqual(adj.fromDate, proposed.firstDay)
      const endsSame = isEqual(adj.toDate, proposed.lastDay)
      const startsAfter = isAfter(adj.fromDate, proposed.firstDay)
      const endsBefore = isBefore(adj.toDate, proposed.lastDay)

      return (startsSame && endsBefore) || (startsAfter && endsBefore) || (startsAfter && endsSame)
    })
  }

  private getOverlappingAdjustments(adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] {
    return adjustments.filter(adj => isBefore(adj.fromDate, proposed.lastDay) && isAfter(adj.toDate, proposed.firstDay))
  }

  validateAgainstExistingRecallUalAdjustments(
    req: FormWizard.Request,
    proposedUal: UAL,
    existingAdjustments: AdjustmentDto[],
  ) {
    const conflictingRecallUALAdjustments = existingAdjustments.filter(adjustment => {
      // Guard against null/undefined dates
      if (!adjustment.fromDate || !adjustment.toDate || !proposedUal?.firstDay || !proposedUal?.lastDay) {
        return false
      }

      return (
        this.isRelevantAdjustment(adjustment).isRelevant === false &&
        isBefore(new Date(adjustment.fromDate), proposedUal.lastDay) &&
        isAfter(new Date(adjustment.toDate), proposedUal.firstDay)
      )
    })
    if (conflictingRecallUALAdjustments.length === 1) {
      return true
    }
    if (conflictingRecallUALAdjustments.length > 1) {
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL, true)
    } else {
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL, null)
      return true
    }
    return false
  }

  validateAgainstExistingNonRecallUalAdjustments(
    req: FormWizard.Request,
    proposedUal: UAL,
    existingAdjustments: AdjustmentDto[],
  ) {
    const conflictingNonRecallUALAdjustments = existingAdjustments.filter(adjustment => {
      return (
        this.isRelevantAdjustment(adjustment).isRelevant &&
        isBefore(adjustment.fromDate, proposedUal.lastDay) &&
        isAfter(adjustment.toDate, proposedUal.firstDay)
      )
    })

    if (conflictingNonRecallUALAdjustments.length > 0) {
      SessionManager.setSessionValue(
        req,
        SessionManager.SESSION_KEYS.RELEVANT_ADJUSTMENTS,
        conflictingNonRecallUALAdjustments,
      )
    } else {
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.RELEVANT_ADJUSTMENTS, null)
      return true
    }
    return false
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { values } = req.form
    const { nomisId } = res.locals
    const prisonerDetails = getPrisoner(req)
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
    const revocationDate = getRevocationDate(req)

    const rtcDate = new Date(values.returnToCustodyDate as string)
    const isInPrisonAtRecall = values.inPrisonAtRecall === 'true'
    const ual = !isInPrisonAtRecall ? calculateUal(journeyData.revocationDate, rtcDate) : null
    const proposedUal = calculateUal(revocationDate, rtcDate)

    const allExistingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)

    const adjustmentsToConsider = getAdjustmentsToConsiderForValidation(journeyData, allExistingAdjustments)

    const hasNoRecallUalConflicts = this.validateAgainstExistingRecallUalAdjustments(
      req,
      proposedUal,
      adjustmentsToConsider,
    )

    const hasNoOtherAdjustmentConflicts = this.validateAgainstExistingNonRecallUalAdjustments(
      req,
      proposedUal,
      adjustmentsToConsider,
    )

    const hasConflicts = !hasNoRecallUalConflicts || !hasNoOtherAdjustmentConflicts

    SessionManager.setSessionValue(
      req,
      SessionManager.SESSION_KEYS.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
      hasConflicts,
    )

    if (ual && !hasConflicts) {
      const ualToSave: UAL = {
        ...ual,
        nomisId,
        bookingId: prisonerDetails.bookingId,
      }

      const conflictingAdjustments = this.identifyConflictingAdjustments(proposedUal, adjustmentsToConsider)
      const allConflicting = [
        ...conflictingAdjustments.exact,
        ...conflictingAdjustments.overlap,
        ...conflictingAdjustments.within,
      ]

      const relevantAdjustments = allConflicting
        .filter(adj => this.isRelevantAdjustment(adj).isRelevant)
        .filter((adj, index, self) => index === self.findIndex(t => t.id === adj.id))

      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.CONFLICTING_ADJUSTMENTS, conflictingAdjustments)

      if (relevantAdjustments.length === 0) {
        if (Object.values(conflictingAdjustments).every(arr => arr.length === 0)) {
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_CREATE, ualToSave)
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_EDIT, null)
        } else if (conflictingAdjustments.exact.length === 1 || conflictingAdjustments.within.length === 1) {
          const existingAdjustment = _.first([...conflictingAdjustments.exact, ...conflictingAdjustments.within])
          const updatedUal: UAL = {
            adjustmentId: existingAdjustment.id,
            bookingId: existingAdjustment.bookingId,
            firstDay: ual.firstDay,
            lastDay: ual.lastDay,
            nomisId: existingAdjustment.person,
          }
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_EDIT, updatedUal)
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_CREATE, null)
        } else {
          const existingAdj = _.first(conflictingAdjustments.overlap)
          const updatedUal: UAL = {
            adjustmentId: existingAdj.id,
            bookingId: existingAdj.bookingId,
            firstDay: rtcDate,
            lastDay: existingAdj.toDate,
            nomisId: existingAdj.person,
          }
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_CREATE, ualToSave)
          SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_EDIT, updatedUal)
        }

        SessionManager.setSessionValue(
          req,
          SessionManager.SESSION_KEYS.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
          false,
        )
        SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.RELEVANT_ADJUSTMENTS, null)
      }
    } else if (!ual) {
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL, null)
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.UAL_TO_CREATE, null)
    }

    if (isInPrisonAtRecall) {
      values.returnToCustodyDate = null
    }

    return super.saveValues(req, res, next)
  }
}
