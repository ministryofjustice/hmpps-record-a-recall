import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isAfter, parseISO } from 'date-fns'

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
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

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
          const ual = calculateUal(revocationDate, rtcDate)
          if (ual) {
            const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
            // We want to check that any overlapping UAL here is a recall UAL, otherwise fail validation per RCLL-322
            const conflictingAdjustments: AdjustmentDto[] = this.getConflictingAdjustments(
              revocationDate,
              rtcDate,
              existingAdjustments,
            )

            if (
              conflictingAdjustments.length > 0 &&
              conflictingAdjustments.some(
                adjustment => this.isNonUalAdjustment(adjustment) || this.isNonRecallUal(adjustment),
              )
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

  getConflictingAdjustments(
    revocationDate: Date,
    rtcDate: Date,
    existingAdjustments?: AdjustmentDto[],
  ): AdjustmentDto[] {
    if (!existingAdjustments || existingAdjustments.length === 0) {
      return []
    }

    const conflictingAdjustments = existingAdjustments.filter(adjustment =>
      this.doesConflict(revocationDate, rtcDate, adjustment),
    )

    return conflictingAdjustments
  }

  doesConflict(revocationDate: Date, rtcDate: Date, adjustment: AdjustmentDto): boolean {
    if (!adjustment.fromDate || !adjustment.toDate) {
      return false
    }
    const recallEnd = rtcDate.getTime()
    const adjStart = parseISO(adjustment.fromDate)
    const adjEnd = parseISO(adjustment.toDate)

    const startsBeforeRecallEnds = isBefore(adjStart, recallEnd)
    const endsAfterRecallStarts = isAfter(adjEnd, revocationDate)

    return startsBeforeRecallEnds && endsAfterRecallStarts
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { values } = req.form
    const { nomisId } = res.locals
    const prisonerDetails = getPrisoner(req)
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    if (values.inPrisonAtRecall === 'false') {
      const revocationDate = getRevocationDate(req)

      const rtcDate = new Date(values.returnToCustodyDate as string)

      const ual = calculateUal(revocationDate, rtcDate)

      const ualToSave: UAL = {
        nomisId,
        bookingId: parseInt(prisonerDetails.bookingId, 10),
        revocationDate: journeyData.revocationDate,
        returnToCustodyDate: rtcDate,
        // We're not currently using this pending aligning with adjustments
        days: journeyData.ual,
      }

      // const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
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
