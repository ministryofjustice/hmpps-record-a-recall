import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, isEqual } from 'date-fns'
import _ from 'lodash'

import type { UAL } from 'models'
import RecallBaseController from './recallBaseController'
import { calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getConflictingAdjustments,
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
      const rtcDate = new Date(values.returnToCustodyDate as string)

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false') {
        if (isBefore(values.returnToCustodyDate as string, revocationDate)) {
          validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRevDate')
        } else {
          const proposedUal = calculateUal(revocationDate, rtcDate)
          if (proposedUal) {
            const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
            // We want to check that any overlapping UAL here is a recall UAL, otherwise fail validation per RCLL-322
            const conflAdjs: ConflictingAdjustments = this.identifyConflictingAdjustments(
              proposedUal,
              existingAdjustments,
            )
            req.sessionModel.set(sessionModelFields.CONFLICTING_ADJUSTMENTS, conflAdjs)

            const allConflicting = [...conflAdjs.exact, ...conflAdjs.overlap, ...conflAdjs.within]
            if (allConflicting.length > 1) {
              validationErrors.returnToCustodyDate = this.formError(
                'returnToCustodyDate',
                'multipleConflictingAdjustment',
              )
            } else if (
              allConflicting.some(adjustment => this.isNonUalAdjustment(adjustment) || this.isNonRecallUal(adjustment))
            ) {
              validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'conflictingAdjustment')
            }
          }
        }
      }
      callback({ ...errors, ...validationErrors })
    })
  }

  isNonUalAdjustment(adjustment: AdjustmentDto) {
    return adjustment.adjustmentType !== 'UNLAWFULLY_AT_LARGE'
  }

  isNonRecallUal(adjustment: AdjustmentDto) {
    return (
      adjustment.adjustmentType === 'UNLAWFULLY_AT_LARGE' &&
      (!adjustment.unlawfullyAtLarge || adjustment.unlawfullyAtLarge.type !== 'RECALL')
    )
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
      const startsOnSameDay = isEqual(adj.fromDate, proposedUal.firstDay)
      const proposedStartsBeforeAdjStart = isBefore(proposedUal.firstDay, adj.fromDate)
      const proposedEndsBeforeAdjEnd = isBefore(proposedUal.lastDay, adj.toDate)

      return (startsOnSameDay || proposedStartsBeforeAdjStart) && proposedEndsBeforeAdjEnd
    })

    return { exact: exactMatches, within: existingWithinProposed, overlap }
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { values } = req.form
    const { nomisId } = res.locals
    const prisonerDetails = getPrisoner(req)
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    const rtcDate = new Date(values.returnToCustodyDate as string)
    const ual = values.inPrisonAtRecall === 'false' ? calculateUal(journeyData.revocationDate, rtcDate) : null
    const conflAdj: ConflictingAdjustments = getConflictingAdjustments(req)

    if (ual) {
      const ualToSave: UAL = {
        ...ual,
        nomisId,
        bookingId: prisonerDetails.bookingId,
      }

      if (Object.values(conflAdj).every(arr => arr.length === 0)) {
        req.sessionModel.set(sessionModelFields.UAL_TO_CREATE, ualToSave)
        req.sessionModel.unset(sessionModelFields.UAL_TO_EDIT)
      } else if (conflAdj.exact.length === 1 || conflAdj.within.length === 1) {
        const existingAdjustment = _.first([...conflAdj.exact, ...conflAdj.within])

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
        const existingAdj = _.first(conflAdj.overlap)

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
    } else {
      req.sessionModel.unset(sessionModelFields.UAL)
      req.sessionModel.unset(sessionModelFields.UAL_TO_CREATE)
      values.returnToCustodyDate = null
    }
    return super.saveValues(req, res, next)
  }
}
