import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, parseISO } from 'date-fns'

import type { UAL } from 'models'
import RecallBaseController from './recallBaseController'
import { calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getExistingAdjustments,
  getPrisoner,
  getRecallDate,
  RecallJourneyData,
  sessionModelFields,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import logger from '../../../logger'

export default class ReturnToCustodyDateController extends RecallBaseController {
  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const { username } = res.locals.user
      const recallDate = getRecallDate(req)
      const rtcDate = new Date(values.returnToCustodyDate as string)

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false' && isBefore(values.returnToCustodyDate as string, recallDate)) {
        validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRecallDate')
      }

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // We want to check that any overlapping UAL here is a recall UAL, otherwise fail validation per RCLL-322
      // console.log('existingAdjustments', existingAdjustments)

      this.getConflictingAdjustment(recallDate, rtcDate, existingAdjustments)

      callback({ ...errors, ...validationErrors })
    })
  }

  getConflictingAdjustment(
    recallDate: Date,
    rtcDate: Date,
    searchResults?: AdjustmentDto[],
  ): { conflictingAdjustments: AdjustmentDto[] } {
    if (!searchResults || searchResults.length === 0) {
      console.log('returning false')
      return { conflictingAdjustments: [] } // No adjustments to check
    }

    // Pass recallDate and returnToCustodyDate explicitly
    const conflictingAdjustments = searchResults.filter(adjustment =>
      this.doesConflict(recallDate, rtcDate, adjustment),
    )

    // const hasConflict = conflictingAdjustments.length > 0
    console.log('Conflicting Adjustments:', conflictingAdjustments)

    return { conflictingAdjustments } // Return boolean and conflicting adjustments
  }

  doesConflict(recallDate: Date, rtcDate: Date, adjustment: AdjustmentDto): boolean {
    if (!adjustment.fromDate || !adjustment.toDate) {
      return false // Ignore adjustments without both dates
    }
    const recallStart = recallDate.getTime()
    const recallEnd = rtcDate.getTime()
    const adjStart = parseISO(adjustment.fromDate)
    const adjEnd = parseISO(adjustment.toDate)

    const startsBeforeRecallEnds = isBefore(adjStart, recallEnd)
    const endsAfterRecallStarts = isAfter(adjEnd, recallStart)

    return startsBeforeRecallEnds && endsAfterRecallStarts
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { values } = req.form
    const { nomisId } = res.locals
    const prisonerDetails = getPrisoner(req)
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    if (values.inPrisonAtRecall === 'false') {
      const recallDate = getRecallDate(req)

      const rtcDate = new Date(values.returnToCustodyDate as string)

      const ual = calculateUal(recallDate, rtcDate)

      const ualToSave: UAL = {
        // We don't have the recall id yet, but we can create everything else and set the recall id once we have it
        nomisId,
        bookingId: parseInt(prisonerDetails.bookingId, 10),
        recallDate: journeyData.recallDate,
        returnToCustodyDate: rtcDate,
        // We're not currently using this pending aligning with adjustments
        days: journeyData.ual,
      }

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // We may also need to update existing adjustments if we're merging with them. We can do that here and stick in the session
      // ready to update them when saving the recall

      req.sessionModel.set(sessionModelFields.UAL_TO_SAVE, ualToSave)
      req.sessionModel.set(sessionModelFields.UAL, ual)
    } else {
      req.sessionModel.unset(sessionModelFields.UAL)
      req.sessionModel.unset(sessionModelFields.UAL_TO_SAVE)
      values.returnToCustodyDate = null
    }

    return super.saveValues(req, res, next)
  }
}
