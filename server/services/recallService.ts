import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import { getRecallType, SentenceAndOffence } from '../@types/recallTypes'
import { ExistingRecall } from '../model/ExistingRecall'
import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import CourtRegisterApiClient from '../data/courtRegisterApiClient'
import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'
import AdjustmentsApiClient from '../data/adjustmentsApiClient'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { CreateRecallJourney } from '../@types/journeys'
import { datePartsToDate, dateToIsoString } from '../utils/utils'

export type DecoratedCourtCase = RecallableCourtCase & {
  recallableSentences: SentenceAndOffence[]
  nonRecallableSentences: SentenceAndOffence[]
}

export default class RecallService {
  constructor(
    private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient,
    private readonly manageOffencesApiClient: ManageOffencesApiClient,
    private readonly prisonRegisterApiClient: PrisonRegisterApiClient,
    private readonly courtRegisterApiClient: CourtRegisterApiClient,
    private readonly adjustmentsApiClient: AdjustmentsApiClient,
  ) {}

  public async getRecallableCourtCases(prisonerId: string): Promise<DecoratedCourtCase[]> {
    const response = await this.remandAndSentencingApiClient.getRecallableCourtCases(prisonerId)

    const offenceCodes = [
      ...new Set(
        response.cases
          .flatMap(c => (c.sentences ?? []).map(s => s.offenceCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]

    const offences = await this.manageOffencesApiClient.getOffencesByCodes(offenceCodes)
    const offenceMap = new Map(offences.map(o => [o.code, o.description]))

    const withDescription = (s: RecallableCourtCaseSentence): SentenceAndOffence => ({
      ...s,
      offenceDescription: s.offenceCode ? (offenceMap.get(s.offenceCode) ?? null) : null,
    })

    return response.cases.map(courtCase => {
      const sentences = courtCase.sentences ?? []
      return {
        ...courtCase,
        recallableSentences: sentences.filter(s => s.isRecallable).map(withDescription),
        nonRecallableSentences: sentences.filter(s => !s.isRecallable).map(withDescription),
      }
    })
  }

  public async getRecallsForPrisoner(prisonerId: string, username: string): Promise<ExistingRecall[]> {
    const sortedRecalls = await this.remandAndSentencingApiClient
      .getAllRecalls(prisonerId, username)
      .then(recalls => recalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

    const requiredPrisons = sortedRecalls.map(recall => recall.createdByPrison)
    const requiredCourts = [
      ...new Set(
        sortedRecalls
          .flatMap(recall => (recall.courtCases ?? []).map(courtCase => courtCase.courtCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]
    const requiredOffences = [
      ...new Set(
        sortedRecalls
          .flatMap(recall => recall.courtCases ?? [])
          .flatMap(courtCase => (courtCase.sentences ?? []).map(s => s.offenceCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]
    const [prisons, courts, offences] = await Promise.all([
      this.prisonRegisterApiClient.getPrisonNames(requiredPrisons, username),
      this.courtRegisterApiClient.getCourtDetails(requiredCourts, username),
      this.manageOffencesApiClient.getOffencesByCodes(requiredOffences),
    ])

    const recallsThatMightHaveAnAdjustment = sortedRecalls
      .filter(recall => recall.source === 'DPS' && recall.revocationDate && recall.returnToCustodyDate)
      .map(recall => recall.recallUuid)
    const adjustments = await Promise.all(
      recallsThatMightHaveAnAdjustment.map(id =>
        this.adjustmentsApiClient.getAdjustmentsForRecall(prisonerId, id, username),
      ),
    ).then(adjustmentResponses => adjustmentResponses.flatMap(it => it))
    const latestRecallUuid = sortedRecalls.length > 0 ? sortedRecalls[0].recallUuid : undefined
    return sortedRecalls.map(recall =>
      this.toExistingRecall(recall, prisons, courts, offences, adjustments, latestRecallUuid),
    )
  }

  private toExistingRecall(
    recall: ApiRecall,
    prisons: Prison[],
    courts: Court[],
    offences: Offence[],
    adjustments: AdjustmentDto[],
    latestRecallUuid: string,
  ): ExistingRecall {
    const isLatestAndDPSRecall = recall.source === 'DPS' && recall.recallUuid === latestRecallUuid
    const adjustmentsForRecall = adjustments.filter(
      adjustment => adjustment && adjustment.recallId === recall.recallUuid,
    )
    let ualAdjustmentTotalDays
    if (adjustmentsForRecall && adjustmentsForRecall.length) {
      ualAdjustmentTotalDays = adjustmentsForRecall.reduce((acc, next) => acc + next.days, 0)
    }
    return {
      recallUuid: recall.recallUuid,
      source: recall.source,
      createdAtTimestamp: recall.createdAt,
      createdAtLocationName: prisons.find(prison => prison.prisonId === recall.createdByPrison)?.prisonName,
      canEdit: isLatestAndDPSRecall,
      canDelete: isLatestAndDPSRecall,
      recallTypeDescription: getRecallType(recall.recallType).description,
      revocationDate: recall.revocationDate,
      returnToCustodyDate: recall.returnToCustodyDate,
      ualAdjustmentTotalDays,
      courtCases: (recall.courtCases ?? []).map(courtCase => ({
        courtCaseReference: courtCase.courtCaseReference,
        courtName: courtCase.courtCode
          ? courts.find(court => court.courtId === courtCase.courtCode)?.courtName
          : undefined,
        courtCaseDate: courtCase.sentencingAppearanceDate,
        sentences: courtCase.sentences.map(sentence => ({
          sentenceUuid: sentence.sentenceUuid,
          offenceCode: sentence.offenceCode,
          offenceDescription: offences.find(offence => offence.code === sentence.offenceCode)?.description,
          offenceStartDate: sentence.offenceStartDate,
          offenceEndDate: sentence.offenceEndDate,
          sentenceDate: sentence.sentenceDate,
          lineNumber: sentence.lineNumber,
          countNumber: sentence.countNumber,
          periodLengths: sentence.periodLengths,
          sentenceServeType: sentence.sentenceServeType,
          sentenceTypeDescription: sentence.sentenceTypeDescription,
        })),
      })),
    }
  }

  public getApiRecallFromJourney(journey: CreateRecallJourney, username: string, prison: string): CreateRecall {
    return {
      prisonerId: journey.nomsId,
      createdByUsername: username,
      createdByPrison: prison,
      recallTypeCode: journey.recallType,
      revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      inPrisonOnRevocationDate: journey.inCustodyAtRecall,
      returnToCustodyDate: journey.inCustodyAtRecall
        ? null
        : dateToIsoString(datePartsToDate(journey.returnToCustodyDate)),
      sentenceIds: journey.sentenceIds,
    }
  }

  async createRecall(recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return this.remandAndSentencingApiClient.createRecall(recall, username)
  }
}
