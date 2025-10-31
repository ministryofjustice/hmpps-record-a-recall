import { Request, Response } from 'express'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import RecallService, { DecoratedCourtCase } from '../../../services/recallService'
import { datePartsToDate, dateToIsoString, maxOf } from '../../../utils/utils'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { SentenceAndOffence } from '../../../@types/recallTypes'
import {
  RecallSentenceCalculation,
  RecordARecallDecisionResult,
} from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class CreateRecallReviewSentencesController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_REVIEW_SENTENCES_AUTOMATED

  constructor(
    private readonly recallService: RecallService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
  ) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!

    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined || decision?.decision !== 'AUTOMATED') {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    const recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId)
    const matchedCourtCases = this.matchRasSentencesAndCrdsSentences(recallableCourtCases, decision)

    const backLink = CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    return res.render('pages/recall/review-sentences-automated', {
      prisoner,
      pageCaption: 'Record a recall',
      courtCases: matchedCourtCases,
      sled: maxOf(
        matchedCourtCases.flatMap(it => it.recallableSentences),
        it => new Date(it.sentenceCalculation.licenseExpiry),
      ),
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, unknown>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    return res.redirect(CreateRecallUrls.recallType(nomsId, journeyId))
  }

  private matchRasSentencesAndCrdsSentences(
    recallableCourtCases: DecoratedCourtCase[],
    decision: RecordARecallDecisionResult,
  ): DecoratedCalculatedCourtCase[] {
    return recallableCourtCases
      .map(courtCase => {
        const filteredSentences = courtCase.recallableSentences
          .map(sentence => {
            const matchingCalculatedSentence = decision.recallableSentences.find(
              calculatedSentence => calculatedSentence.uuid === sentence.sentenceUuid,
            )
            if (matchingCalculatedSentence) {
              return {
                ...sentence,
                sentenceCalculation: matchingCalculatedSentence.sentenceCalculation,
              } as DecoratedCalculatedSentence
            }
            return null
          })
          .filter(it => !!it)
        if (filteredSentences.length) {
          return { ...courtCase, recallableSentences: filteredSentences }
        }
        return null
      })
      .filter(it => !!it)
  }
}

export type DecoratedCalculatedSentence = SentenceAndOffence & {
  sentenceCalculation: RecallSentenceCalculation
}
export type DecoratedCalculatedCourtCase = DecoratedCourtCase & {
  recallableSentences: DecoratedCalculatedSentence[]
}
