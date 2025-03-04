import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore } from 'date-fns'

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

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false' && isBefore(values.returnToCustodyDate as string, recallDate)) {
        validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRecallDate')
      }

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // We want to check that any overlapping UAL here is a recall UAL, otherwise fail validation per RCLL-322
      console.log(existingAdjustments)

      callback({ ...errors, ...validationErrors })
    })
  }

  hasConflictingAdjustment(
    ual: UAL,
    searchResults?: AdjustmentDto[],
  ): { hasConflict: boolean; conflictingAdjustments: AdjustmentDto[] } {
    console.log('*****************1', searchResults)

    if (!searchResults || searchResults.length === 0) {
      console.log('returning false')
      return { hasConflict: false, conflictingAdjustments: [] } // No adjustments to check
    }

    // collect all conflicting adjustments in an array
    const conflictingAdjustments = searchResults.filter(adjustment => this.doesConflict(ual, adjustment))

    const hasConflict = conflictingAdjustments.length > 0
    console.log('Conflicting Adjustments:', conflictingAdjustments)

    return { hasConflict, conflictingAdjustments } // boolean and arr of conflicting sdjustments
  }

  doesConflict(ual: UAL, adjustment: AdjustmentDto): boolean {
    if (!adjustment.fromDate || !adjustment.toDate) {
      return false // toDate amd fromDate are optional in AdjustmentDto, so may not have both dates, therefore ignore
    }

    const recallStart = new Date(ual.recallDate).getTime()
    const recallEnd = new Date(ual.returnToCustodyDate).getTime()
    const adjStart = new Date(adjustment.fromDate).getTime()
    const adjEnd = new Date(adjustment.toDate).getTime()

    // Check if the date ranges overlap
    return adjStart <= recallEnd && adjEnd >= recallStart
  }

  // hasConflictingAdjustment(ual: UAL, searchResults?: AdjustmentDto[]) {
  //   console.log('*****************1', searchResults)
  //   if (searchResults && searchResults.length === 0) {
  //     console.log('returning false')
  //     //no comparison
  //     return false
  //   }
  //   console.log('returning true')

  //   // for each/map iterate adjustmentDto searchResults fn to see if true or false
  //   // return false if even one is overlapping
  //   // when conflicing return ALL conflicting ones in conflictingAdjustments array
  //   // return arr is not empty
  //   // this.doesConflict() // for each search result

  //   return true
  // }

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
