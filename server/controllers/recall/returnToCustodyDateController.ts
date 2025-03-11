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

export default class ReturnToCustodyDateController extends RecallBaseController {
  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const recallDate = getRecallDate(req)
      const rtcDate = new Date(values.returnToCustodyDate as string)

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false') {
        if (isBefore(values.returnToCustodyDate as string, recallDate)) {
          validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRecallDate')
        }

        const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
        // We want to check that any overlapping UAL here is a recall UAL, otherwise fail validation per RCLL-322

        const conflictingAdjustments: AdjustmentDto[] = this.getConflictingAdjustments(
          recallDate,
          rtcDate,
          existingAdjustments,
        )

        if (
          conflictingAdjustments.some(
            adjustment => this.isNonUalAdjustment(adjustment) || this.isNonRecallUal(adjustment),
          )
        ) {
          validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'conflictingAdjustment')
        }
      }
      callback({ ...errors, ...validationErrors })
    })
  }

  isNonUalAdjustment(adjustment: AdjustmentDto) {
    return adjustment.adjustmentType !== 'UNLAWFULLY_AT_LARGE'
  }

  isNonRecallUal(adjustment: AdjustmentDto) {
    return adjustment.adjustmentType === 'UNLAWFULLY_AT_LARGE' && adjustment.unlawfullyAtLarge!.type !== 'RECALL'
  }

  getConflictingAdjustments(recallDate: Date, rtcDate: Date, existingAdjustments?: AdjustmentDto[]): AdjustmentDto[] {
    if (!existingAdjustments || existingAdjustments.length === 0) {
      return []
    }

    const conflictingAdjustments = existingAdjustments.filter(adjustment =>
      this.doesConflict(recallDate, rtcDate, adjustment),
    )

    return conflictingAdjustments
  }

  doesConflict(recallDate: Date, rtcDate: Date, adjustment: AdjustmentDto): boolean {
    if (!adjustment.fromDate || !adjustment.toDate) {
      return false
    }
    const recallEnd = rtcDate.getTime()
    const adjStart = parseISO(adjustment.fromDate)
    const adjEnd = parseISO(adjustment.toDate)

    const startsBeforeRecallEnds = isBefore(adjStart, recallEnd)
    const endsAfterRecallStarts = isAfter(adjEnd, recallDate)

    return startsBeforeRecallEnds && endsAfterRecallStarts
  }

  // check if exact matches here to know if post or updating something call exact match
  // and just overlapping/conflicting ones.
  // no matches - post
  //  if only an exact - put update exisitng one with recall id
  // conflicting( exact/overlap) after passed error checks - save to session will be edit in validate

  // we want to editUal - change start/end date to reduce OR exact match dont do that

  // in checkyouranswers controller needs to update new recall
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
        nomisId,
        bookingId: parseInt(prisonerDetails.bookingId, 10),
        recallDate: journeyData.recallDate,
        returnToCustodyDate: rtcDate,
        // We're not currently using this pending aligning with adjustments
        days: journeyData.ual,
      }

      // const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // We may also need to update existing adjustments if we're merging with them. We can do that here and stick in the session
      // ready to update them when saving the recall

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)

      const conflictingAdjustments: AdjustmentDto[] = this.getConflictingAdjustments(
        recallDate,
        rtcDate,
        existingAdjustments,
      )
      console.log('in save values', conflictingAdjustments)

      const hasExactMatch = conflictingAdjustments.some(
        adjustment =>
          adjustment.fromDate === recallDate.toISOString().split('T')[0] && // T cos iso date string have full timestamp and just want date
          adjustment.toDate === rtcDate.toISOString().split('T')[0],
      )

      if (hasExactMatch) {
        req.sessionModel.set(sessionModelFields.UAL_TO_EDIT, ual)
      } else {
        console.log('No exact match. Update or create a new UAL adjustment.')
      }

      // ualtoupdate and ualtocreate not ualtosave
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
