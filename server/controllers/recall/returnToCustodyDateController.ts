import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, isEqual } from 'date-fns'
import _ from 'lodash'

import type { UAL } from 'models'
import RecallBaseController from './recallBaseController'
import { calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getExistingAdjustments,
  getPrisoner,
  getRevocationDate,
  RecallJourneyData,
  sessionModelFields,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto, ConflictingAdjustments } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class ReturnToCustodyDateController extends RecallBaseController {
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

    const exactMatches = existingAdjustments.filter(
      (adj: AdjustmentDto) => isEqual(adj.fromDate, proposedUal.firstDay) && isEqual(adj.toDate, proposedUal.lastDay),
    )

    const existingWithinProposed = existingAdjustments.filter((adj: AdjustmentDto) => {
      const startsOnSameDay = isEqual(adj.fromDate, proposedUal.firstDay)
      const proposedEndsAfterAdjEnd = isAfter(proposedUal.lastDay, adj.toDate)
      const proposedStartsBeforeAdjStart = isBefore(proposedUal.firstDay, adj.fromDate)
      const endsOnSameDay = isEqual(adj.toDate, proposedUal.lastDay)

      return (
        (startsOnSameDay && proposedEndsAfterAdjEnd) ||
        (proposedStartsBeforeAdjStart && proposedEndsAfterAdjEnd) ||
        (proposedStartsBeforeAdjStart && endsOnSameDay)
      )
    })

    const overlap = existingAdjustments.filter((adj: AdjustmentDto) => {
      return isBefore(adj.fromDate, proposedUal.lastDay) && isAfter(adj.toDate, proposedUal.firstDay)
    })

    return { exact: exactMatches, within: existingWithinProposed, overlap }
  }

  validateAgainstExistingRecallUalAdjustments(
    req: FormWizard.Request,
    proposedUal: UAL,
    existingAdjustments: AdjustmentDto[],
  ) {
    const conflictingRecallUALAdjustments = existingAdjustments.filter(adjustment => {
      return (
        this.isRelevantAdjustment(adjustment).isRelevant === false &&
        isBefore(adjustment.fromDate, proposedUal.lastDay) &&
        isAfter(adjustment.toDate, proposedUal.firstDay)
      )
    })
    if (conflictingRecallUALAdjustments.length === 1) {
      return true
    }
    if (conflictingRecallUALAdjustments.length > 1) {
      req.sessionModel.set(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL, true)
    } else {
      req.sessionModel.unset(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL)
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
      req.sessionModel.set(sessionModelFields.RELEVANT_ADJUSTMENTS, conflictingNonRecallUALAdjustments)
    } else {
      req.sessionModel.unset(sessionModelFields.RELEVANT_ADJUSTMENTS)
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

    const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)

    const hasNoRecallUalConflicts = this.validateAgainstExistingRecallUalAdjustments(
      req,
      proposedUal,
      existingAdjustments,
    )

    const hasNoOtherAdjustmentConflicts = this.validateAgainstExistingNonRecallUalAdjustments(
      req,
      proposedUal,
      existingAdjustments,
    )

    const hasConflicts = !hasNoRecallUalConflicts || !hasNoOtherAdjustmentConflicts

    req.sessionModel.set(sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS, hasConflicts)

    if (ual && !hasConflicts) {
      const ualToSave: UAL = {
        ...ual,
        nomisId,
        bookingId: prisonerDetails.bookingId,
      }

      const conflictingAdjustments = this.identifyConflictingAdjustments(proposedUal, existingAdjustments)
      const allConflicting = [
        ...conflictingAdjustments.exact,
        ...conflictingAdjustments.overlap,
        ...conflictingAdjustments.within,
      ]

      const relevantAdjustments = allConflicting
        .filter(adj => this.isRelevantAdjustment(adj).isRelevant)
        .filter((adj, index, self) => index === self.findIndex(t => t.id === adj.id))

      req.sessionModel.set(sessionModelFields.CONFLICTING_ADJUSTMENTS, conflictingAdjustments)

      if (relevantAdjustments.length === 0) {
        if (Object.values(conflictingAdjustments).every(arr => arr.length === 0)) {
          req.sessionModel.set(sessionModelFields.UAL_TO_CREATE, ualToSave)
          req.sessionModel.unset(sessionModelFields.UAL_TO_EDIT)
        } else if (conflictingAdjustments.exact.length === 1 || conflictingAdjustments.within.length === 1) {
          const existingAdjustment = _.first([...conflictingAdjustments.exact, ...conflictingAdjustments.within])
          const updatedUal: UAL = {
            adjustmentId: existingAdjustment.id,
            bookingId: existingAdjustment.bookingId,
            firstDay: ual.firstDay,
            lastDay: ual.lastDay,
            nomisId: existingAdjustment.person,
          }
          req.sessionModel.set(sessionModelFields.UAL_TO_EDIT, updatedUal)
          req.sessionModel.unset(sessionModelFields.UAL_TO_CREATE)
        } else {
          const existingAdj = _.first(conflictingAdjustments.overlap)
          const updatedUal: UAL = {
            adjustmentId: existingAdj.id,
            bookingId: existingAdj.bookingId,
            firstDay: rtcDate,
            lastDay: existingAdj.toDate,
            nomisId: existingAdj.person,
          }
          req.sessionModel.set(sessionModelFields.UAL_TO_CREATE, ualToSave)
          req.sessionModel.set(sessionModelFields.UAL_TO_EDIT, updatedUal)
        }

        req.sessionModel.set(sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS, false)
        req.sessionModel.unset(sessionModelFields.RELEVANT_ADJUSTMENTS)
      }
    } else if (!ual) {
      req.sessionModel.unset(sessionModelFields.UAL)
      req.sessionModel.unset(sessionModelFields.UAL_TO_CREATE)
    }

    if (isInPrisonAtRecall) {
      values.returnToCustodyDate = null
    }

    return super.saveValues(req, res, next)
  }
}
