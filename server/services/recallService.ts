import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  IsRecallPossibleRequest,
  IsRecallPossibleResponse,
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
import { RecallJourney, DecoratedCourtCase } from '../@types/journeys'
import { datePartsToDate, dateToIsoString } from '../utils/utils'

export default class RecallService {
  constructor(
    private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient,
    private readonly manageOffencesApiClient: ManageOffencesApiClient,
    private readonly prisonRegisterApiClient: PrisonRegisterApiClient,
    private readonly courtRegisterApiClient: CourtRegisterApiClient,
  ) {}

  public async getRecallableCourtCases(prisonerId: string, username: string): Promise<DecoratedCourtCase[]> {
    const response = await this.remandAndSentencingApiClient.getRecallableCourtCases(prisonerId)

    const courtIds = response.cases.map(c => c.courtCode)

    const courtDetailsList = await this.courtRegisterApiClient.getCourtDetails(courtIds, username)

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
        courtName: courtDetailsList.find(c => c.courtId === courtCase.courtCode).courtName,
      }
    })
  }

  public async getLatestRevocationDate(
    prisonerId: string,
    username: string,
    recallIdToExclude?: string,
  ): Promise<Date> {
    const sortedRecalls = await this.remandAndSentencingApiClient
      .getAllRecalls(prisonerId, username)
      .then(recalls =>
        recalls
          .filter(it => it.revocationDate && (!recallIdToExclude || it.recallUuid !== recallIdToExclude))
          .sort((a, b) => new Date(b.revocationDate).getTime() - new Date(a.revocationDate).getTime()),
      )
    return sortedRecalls.length > 0 ? new Date(sortedRecalls[0].revocationDate) : undefined
  }

  public async getRecallsForPrisoner(prisonerId: string, username: string): Promise<ExistingRecall[]> {
    const sortedRecalls = await this.remandAndSentencingApiClient
      .getAllRecalls(prisonerId, username)
      .then(recalls => recalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    const latestRecallUuid = sortedRecalls.length > 0 ? sortedRecalls[0].recallUuid : undefined
    return this.enrichRecalls(
      sortedRecalls,
      username,
      recall => recall.source === 'DPS' && recall.recallUuid === latestRecallUuid,
    )
  }

  public async getRecall(recallUuid: string, username: string): Promise<ExistingRecall> {
    const recall = await this.remandAndSentencingApiClient.getRecall(recallUuid, username)
    return this.enrichRecalls([recall], username).then(enriched => enriched[0])
  }

  private async enrichRecalls(
    recalls: ApiRecall[],
    username: string,
    isEditableAndDeletable: (recall: ApiRecall) => boolean = () => false,
  ): Promise<ExistingRecall[]> {
    const requiredPrisons = recalls.map(recall => recall.createdByPrison).filter(it => it)
    const requiredCourts = [
      ...new Set(
        recalls
          .flatMap(recall => (recall.courtCases ?? []).map(courtCase => courtCase.courtCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]
    const requiredOffences = [
      ...new Set(
        recalls
          .flatMap(recall => recall.courtCases ?? [])
          .flatMap(courtCase => (courtCase.sentences ?? []).map(s => s.offenceCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]
    const [prisons, courts, offences] = await Promise.all([
      requiredPrisons.length
        ? this.prisonRegisterApiClient.getPrisonNames(requiredPrisons, username)
        : Promise.resolve([]),
      requiredCourts.length
        ? this.courtRegisterApiClient.getCourtDetails(requiredCourts, username)
        : Promise.resolve([]),
      requiredOffences.length ? this.manageOffencesApiClient.getOffencesByCodes(requiredOffences) : Promise.resolve([]),
    ])

    return recalls.map(recall => this.toExistingRecall(recall, prisons, courts, offences, isEditableAndDeletable))
  }

  private toExistingRecall(
    recall: ApiRecall,
    prisons: Prison[],
    courts: Court[],
    offences: Offence[],
    isEditableAndDeletable: (recall: ApiRecall) => boolean = () => false,
  ): ExistingRecall {
    const isLatestAndDPSRecall = isEditableAndDeletable(recall)
    const sentenceIds: string[] = []
    const existingRecall = {
      recallUuid: recall.recallUuid,
      prisonerId: recall.prisonerId,
      source: recall.source,
      createdAtTimestamp: recall.createdAt,
      createdAtLocationName: prisons.find(prison => prison.prisonId === recall.createdByPrison)?.prisonName,
      canEdit: isLatestAndDPSRecall,
      canDelete: isLatestAndDPSRecall,
      recallTypeCode: recall.recallType,
      recallTypeDescription: getRecallType(recall.recallType).description,
      revocationDate: recall.revocationDate,
      inPrisonOnRevocationDate: recall.inPrisonOnRevocationDate,
      returnToCustodyDate: recall.returnToCustodyDate,
      calculationRequestId: recall.calculationRequestId,
      ualAdjustmentTotalDays: recall.ual?.days,
      courtCases: (recall.courtCases ?? []).map(courtCase => ({
        courtCaseReference: courtCase.courtCaseReference,
        courtCaseUuid: courtCase.courtCaseUuid,
        courtName: courtCase.courtCode
          ? courts.find(court => court.courtId === courtCase.courtCode)?.courtName
          : undefined,
        courtCaseDate: courtCase.sentencingAppearanceDate,
        sentences: courtCase.sentences.map(sentence => {
          sentenceIds.push(sentence.sentenceUuid)
          return {
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
          }
        }),
      })),
    }
    return { ...existingRecall, sentenceIds }
  }

  public getApiRecallFromJourney(journey: RecallJourney, username: string, prison: string): CreateRecall {
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
      calculationRequestId: journey.calculationRequestId,
    }
  }

  async createRecall(recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return this.remandAndSentencingApiClient.createRecall(recall, username)
  }

  async editRecall(recallId: string, recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return this.remandAndSentencingApiClient.editRecall(recallId, recall, username)
  }

  async deleteRecall(recallUuid: string, username: string) {
    return this.remandAndSentencingApiClient.deleteRecall(recallUuid, username)
  }

  public getCasesSelectedForRecall(journey: RecallJourney) {
    const { courtCaseIdsSelectedForRecall = [] } = journey
    const cases = journey.recallableCourtCases ?? []
    return cases.filter(courtCase => courtCaseIdsSelectedForRecall.includes(courtCase.courtCaseUuid))
  }

  async isRecallPossible(request: IsRecallPossibleRequest, username: string): Promise<IsRecallPossibleResponse> {
    return this.remandAndSentencingApiClient.isRecallPossible(request, username)
  }
}
