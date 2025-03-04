import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import type { UAL } from 'models'
import RecallBaseController from './recallBaseController'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList } from '../../utils/utils'
import getJourneyDataFromRequest, { getPrisoner, RecallJourneyData } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class CheckYourAnswersController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { nomisId } = res.locals
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    const editLink = (step: string) => `/person/${nomisId}/record-recall/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    return {
      ...super.locals(req, res),
      answerSummaryList,
      ualText: journeyData.ualText,
    }
  }

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    try {
      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const { nomisId } = res.locals
      const prisonerDetails = getPrisoner(req)
      const { username } = res.locals.user

      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        revocationDate: journeyData.recallDateString,
        returnToCustodyDate: journeyData.returnToCustodyDateString,
        recallTypeCode: journeyData.recallType.code,
        createdByUsername: username,
        createdByPrison: 'Not known',
        sentenceIds: journeyData.sentenceIds,
      }

      const createResponse = await req.services.recallService.postRecall(recallToSave, username)

      const ualToCreate: UAL = {
        recallId: createResponse.recallUuid,
        nomisId,
        bookingId: parseInt(prisonerDetails.bookingId, 10),
        recallDate: journeyData.recallDate,
        returnToCustodyDate: journeyData.returnToCustodyDate,
        days: journeyData.ual,
      }

      const searchResults: AdjustmentDto[] | null = await req.services.adjustmentsService
        .searchUal(nomisId, username)
        .catch((e: Error): AdjustmentDto[] | null => {
          logger.error(e.message)
          return null
        })

      if (!this.hasConflictingAdjustment(ualToCreate, searchResults)) {
        await req.services.adjustmentsService.postUal(ualToCreate, username).catch(() => {
          logger.error('Error while posting UAL to adjustments API')
        })

        // fn(ual) same parameters as recalls?
      }
      return next()
    } catch (error) {
      return next(error)
    }
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

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.flash('action', `recorded`)
    return super.successHandler(req, res, next)
  }
}
