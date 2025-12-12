import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import OtherServiceUrls from '../../otherServiceUrls'

export default class UnknownPreRecallSentenceTypeController implements Controller {
  PAGE_NAME: Page = Page.UNKNOWN_PRE_RECALL_SENTENCE_TYPE_INTERCEPT

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { username } = req.user
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    const isPossible = await this.recallService.isRecallPossible(
      {
        recallType: journey.recallType,
        sentenceIds: journey.sentenceIds,
      },
      username,
    )
    const recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)

    const unknownPreRecallCourtCases = recallableCourtCases
      .map(it => {
        const filteredSentences = [...it.recallableSentences, ...it.nonRecallableSentences].filter(sentence => {
          return isPossible.sentenceIds.includes(sentence.sentenceUuid)
        })
        if (filteredSentences.length) {
          return { ...it, sentences: filteredSentences }
        }
        return null
      })
      .filter(it => !!it)

    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )

    const params = new URLSearchParams()
    isPossible.sentenceIds.forEach(uuid => params.append('sentenceUuids', uuid))

    return res.render('pages/recall/unknown-pre-recall-type', {
      prisoner,
      continueLink: OtherServiceUrls.rasUnknownSentenceTypes(nomsId, params.toString()),
      cancelLink,
      unknownPreRecallCourtCases,
    })
  }
}
