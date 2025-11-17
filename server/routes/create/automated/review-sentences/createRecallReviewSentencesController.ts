import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import CreateRecallUrls from '../../createRecallUrls'
import { DecoratedCourtCase, PersonJourneyParams } from '../../../../@types/journeys'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import { datePartsToDate, dateToIsoString, maxOf } from '../../../../utils/utils'
import CalculateReleaseDatesService from '../../../../services/calculateReleaseDatesService'
import { SentenceAndOffence } from '../../../../@types/recallTypes'
import { AutomatedCalculationData } from '../../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

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

    const recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)

    const backLink = journey.isCheckingAnswers
      ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
      : CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)

    const cancelUrl = CreateRecallUrls.confirmCancel(
      nomsId,
      journeyId,
      CreateRecallUrls.reviewSentencesAutomatedJourney.name,
    )
    return res.render('pages/recall/review-sentences-automated', {
      prisoner,
      pageCaption: 'Record a recall',
      courtCases: this.matchRasSentencesAndCrdsSentences(recallableCourtCases, decision.automatedCalculationData),
      sled: maxOf(
        decision.automatedCalculationData.recallableSentences,
        it => new Date(it.sentenceCalculation.licenseExpiry),
      ),
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, unknown>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )
    journey.sentenceIds = decision.automatedCalculationData.recallableSentences.map(it => it.uuid)
    journey.calculationRequestId = decision.automatedCalculationData.calculationRequestId

    return res.redirect(CreateRecallUrls.recallType(nomsId, journeyId))
  }

  private matchRasSentencesAndCrdsSentences(
    recallableCourtCases: DecoratedCourtCase[],
    automatedCalculationData: AutomatedCalculationData,
  ): DecoratedCourtCaseWithCrdsResults[] {
    const recallableIds = automatedCalculationData.recallableSentences.map(it => it.uuid)
    const ineligibleIds = [
      ...automatedCalculationData.ineligibleSentences.map(it => it.uuid),
      automatedCalculationData.sentencesBeforeInitialRelease.map(it => it.uuid),
    ]
    const expiredIds = automatedCalculationData.expiredSentences.map(it => it.uuid)
    return recallableCourtCases
      .map(courtCase => {
        const sentences = {
          eligible: [] as SentenceAndOffence[],
          ineligible: [] as SentenceAndOffence[],
          expired: [] as SentenceAndOffence[],
        }

        const allSentences = [...courtCase.recallableSentences, ...courtCase.nonRecallableSentences]
        allSentences.forEach(sentence => {
          if (recallableIds.includes(sentence.sentenceUuid)) {
            sentences.eligible.push(sentence)
          }
          if (ineligibleIds.includes(sentence.sentenceUuid)) {
            sentences.ineligible.push(sentence)
          }
          if (expiredIds.includes(sentence.sentenceUuid)) {
            sentences.expired.push(sentence)
          }
        })

        return {
          ...courtCase,
          eligibleSentences: sentences.eligible,
          ineligibleSentences: sentences.ineligible,
          expiredSentences: sentences.expired,
        } as DecoratedCourtCaseWithCrdsResults
      })
      .filter(courtCase => courtCase.eligibleSentences.length)
  }
}

type DecoratedCourtCaseWithCrdsResults = DecoratedCourtCase & {
  eligibleSentences: SentenceAndOffence[]
  ineligibleSentences: SentenceAndOffence[]
  expiredSentences: SentenceAndOffence[]
}
