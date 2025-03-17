import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, isEqual, format, addDays } from 'date-fns'
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
          console.log('1 ---------equal or after')
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
            console.log('2 ------------*****************happy path')
            req.sessionModel.set(sessionModelFields.CONFLICTING_ADJUSTMENTS, conflAdjs)

            const allConflicting = [...conflAdjs.exact, ...conflAdjs.overlap, ...conflAdjs.within]
            if (allConflicting.length > 1) {
              console.log(
                '3 ----------too many',
                'ex"',
                conflAdjs.exact,
                'over',
                conflAdjs.overlap,
                'wothin',
                conflAdjs.within,
              )
              validationErrors.returnToCustodyDate = this.formError(
                'returnToCustodyDate',
                'multipleConflictingAdjustment',
              )
            } else if (
              allConflicting.some(adjustment => this.isNonUalAdjustment(adjustment) || this.isNonRecallUal(adjustment))
            ) {
              console.log('4 ---------- conflicting')
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

    //  exact.push(existingAdjustments.filter(adj => { isEqual(adj.fromDate, proposedUal.firstDay) && isEqual(adj.toDate, proposedUal.lastDay)) } ))
    const exactMatches = existingAdjustments.filter(
      (adj: AdjustmentDto) => isEqual(adj.fromDate, proposedUal.firstDay) && isEqual(adj.toDate, proposedUal.lastDay),
    )

    const existingWithinProposed = existingAdjustments.filter((adj: AdjustmentDto) => {
      // UAL 2
      const startsOnSameDay = isEqual(adj.fromDate, proposedUal.firstDay)
      const proposedEndsAfterAdjEnd = isAfter(proposedUal.lastDay, adj.toDate)

      // UAL 3
      const proposedStartsBeforeAdjStart = isBefore(proposedUal.firstDay, adj.fromDate)
      // and proposedEndsAfterAdjEnd

      // UAL 4
      // proposedStartsBeforeAdjStart and
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

      console.log(adj.id, startsOnSameDay, proposedStartsBeforeAdjStart, proposedEndsBeforeAdjEnd)

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

    console.log(conflAdj, '--------------------------')

    if (ual) {
      const ualToSave: UAL = {
        ...ual,
        nomisId,
        bookingId: parseInt(prisonerDetails.bookingId, 10),
      }

      if (Object.values(conflAdj).every(arr => arr.length === 0)) {
        req.sessionModel.set(sessionModelFields.UAL_TO_CREATE, ualToSave)
        req.sessionModel.set(sessionModelFields.UAL, ual)
        req.sessionModel.unset(sessionModelFields.UAL_TO_EDIT)
      } else if (conflAdj.exact.length === 1 || conflAdj.within.length === 1) {
        const withinAndExactAdjustments = [...conflAdj.exact, ...conflAdj.within]
        const firstAdjustment = _.first(withinAndExactAdjustments)

        if (firstAdjustment) {
          // adjustment ID to the UAL we are updating + Set recallId from existing adjustment
          const updatedUal: UAL = {
            ...ual,
            recallId: firstAdjustment.id, // recall id in other controller
          }

          req.sessionModel.set(sessionModelFields.UAL_TO_EDIT, updatedUal)
          req.sessionModel.unset(sessionModelFields.UAL_TO_CREATE)
        }
      } else if (conflAdj.overlap.length > 0) {
        // update start date to day after our UAL
        const newToDate = format(addDays(new Date(ual.firstDay), 1), 'yyyy-MM-dd')
        conflAdj.overlap[0].toDate = newToDate
        const firstOverlap = _.first(conflAdj.overlap)

        if (firstOverlap) {
          const updatedUal: UAL = {
            ...ual,
            recallId: firstOverlap.id, // Set recallId from the overlapping adjustment
            firstDay: rtcDate, // Update start date to returnToCustodyDate
          }

          req.sessionModel.set(sessionModelFields.UAL_TO_CREATE, ualToSave)
          req.sessionModel.set(sessionModelFields.UAL, updatedUal)
        }
      }

      // TODO We now want to identify if we should be creating and/or updatina djustments

      // IF no conflicting, just remember that we want to post new UAL, set recall ID on it later
      // ELSE if exact match or within, remember that we want to update it (make start/end dates match, set recallId on it later)
      // ELSE if overlap remember that we want to
      //  1- existingadj: update start date to day after our UAL, NOT add recallId later, (ual to create is our ual, update is ual with start date set after ours)
      //  2- our adjustment: post our new UAL , set recallID on it later

      // const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // We may also need to update existing adjustments if we're merging with them. We can do that here and stick in the session
      // ready to update them when saving the recall
    } else {
      req.sessionModel.unset(sessionModelFields.UAL)
      req.sessionModel.unset(sessionModelFields.UAL_TO_CREATE)
      values.returnToCustodyDate = null
    }
    return super.saveValues(req, res, next)
  }
}
