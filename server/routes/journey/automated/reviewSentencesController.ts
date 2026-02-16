import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { DecoratedCourtCase, PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import { buildRecordARecallRequest, maxOf } from '../../../utils/utils'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { SentenceAndOffence } from '../../../@types/recallTypes'
import { AutomatedCalculationData } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class ReviewSentencesController implements Controller {
  PAGE_NAME: Page = Page.REVIEW_SENTENCES_AUTOMATED

  constructor(
    private readonly recallService: RecallService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
  ) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      buildRecordARecallRequest(journey, recallId),
      username,
    )

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined || decision?.decision !== 'AUTOMATED') {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    const recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)

    const backLink = journey.isCheckingAnswers
      ? RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
      : RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId)
    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.reviewSentencesAutomatedJourney.name,
    )
    return res.render('pages/recall/review-sentences-automated', {
      prisoner,
      isEdit: createOrEdit === 'edit',
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
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      buildRecordARecallRequest(journey, recallId),
      username,
    )

    // The make-decision call to the CRD-API can return DUPLICATED sentences, they need omitting.
    // Doing that in the same way the GET currently works; i.e. by only including sentences that exist from the RAS-API get-recallable-court-cases call
    const recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)
    journey.sentenceIds = recallableCourtCases
      .flatMap(courtCase => [...courtCase.recallableSentences, ...courtCase.nonRecallableSentences])
      .map(sentence => sentence.sentenceUuid)
      .filter(uuid => decision.automatedCalculationData.recallableSentences.some(sentence => sentence.uuid === uuid))
    journey.calculationRequestId = decision.automatedCalculationData.calculationRequestId
    journey.automatedCalculationData = decision.automatedCalculationData

    return res.redirect(RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId))
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
        // eslint-disable-next-line no-console
        console.log('eligible sentence **********', sentences.eligible)
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
