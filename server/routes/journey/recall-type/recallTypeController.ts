import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import RecallJourneyUrls from '../recallJourneyUrls'
import { Page } from '../../../services/auditService'
import { RecallTypes } from '../../../@types/recallTypes'
import { RecallTypeForm } from './recallTypeSchema'
import RecallService from '../../../services/recallService'

export default class RecallTypeController implements Controller {
  PAGE_NAME: Page = Page.RECALL_TYPE

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    let backLink: string
    if (journey.isCheckingAnswers) {
      backLink = RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    } else if (journey.calculationRequestId) {
      backLink = RecallJourneyUrls.reviewSentencesAutomatedJourney(nomsId, journeyId, createOrEdit, recallId)
    } else {
      backLink = RecallJourneyUrls.manualCheckSentences(nomsId, journeyId, createOrEdit, recallId)
    }
    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.recallType.name,
    )

    const recallType = formResponses?.recallType ?? journey.recallType
    // Build recall type options
    const recallTypeOptions = Object.values(RecallTypes).map(({ code, description }) => ({
      id: `recallType-${code}`,
      value: code,
      text: description,
      checked: recallType === code,
    }))

    return res.render('pages/recall/recall-type', {
      prisoner,
      isEdit: createOrEdit === 'edit',
      recallTypeOptions,
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, RecallTypeForm>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const { recallType } = req.body
    journey.recallType = recallType

    const isPossible = await this.recallService.isRecallPossible(
      {
        recallType,
        sentenceIds: journey.sentenceIds,
      },
      username,
    )
    if (isPossible.isRecallPossible === 'YES') {
      if (journey.automatedCalculationData?.unexpectedRecallTypes?.includes(recallType) === true) {
        return res.redirect(RecallJourneyUrls.unexpectedRecallTypeIntercept(nomsId, journeyId, createOrEdit, recallId))
      }
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }
    if (isPossible.isRecallPossible === 'RECALL_TYPE_AND_SENTENCE_MAPPING_NOT_POSSIBLE') {
      return res.redirect(
        RecallJourneyUrls.unsupportedRecallTypeSentenceTypeMappingIntercept(nomsId, journeyId, createOrEdit, recallId),
      )
    }
    if (isPossible.isRecallPossible === 'UNKNOWN_PRE_RECALL_MAPPING') {
      return res.redirect(RecallJourneyUrls.unkownPreRecallTypeIntercept(nomsId, journeyId, createOrEdit, recallId))
    }
    throw Error(`Unknown is possible response ${isPossible.isRecallPossible}`)
  }
}
