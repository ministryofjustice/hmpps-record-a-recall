import dayjs from 'dayjs'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  IsRecallPossibleRequest,
  IsRecallPossibleResponse,
  RecallableCourtCaseSentence,
  SentenceConsecutiveToDetailsResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import { ConsecutiveToDetails, getRecallType, SentenceAndOffence } from '../@types/recallTypes'
import { ExistingRecall } from '../model/ExistingRecall'
import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import CourtRegisterApiClient from '../data/courtRegisterApiClient'
import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'
import { DecoratedCourtCase, RecallJourney } from '../@types/journeys'
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

    const consecutiveToDetails = await this.getConsecutiveToDetails(response.cases, username)

    const courtIds = [
      ...new Set(response.cases.map(c => c.courtCode).concat(consecutiveToDetails.sentences.map(s => s.courtCode))),
    ]
    const courtDetailsList = await this.courtRegisterApiClient.getCourtDetails(courtIds, username)

    const offenceCodes = [
      ...new Set(
        response.cases
          .flatMap(c => (c.sentences ?? []).map(s => s.offenceCode))
          .concat(consecutiveToDetails.sentences.map(s => s.offenceCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]

    const offences = await this.manageOffencesApiClient.getOffencesByCodes(offenceCodes)
    const offenceMap = new Map(offences.map(o => [o.code, o.description]))

    const consecutiveToDetailsBySentenceUuid = await this.buildConsecutiveToDetailsMap(
      offenceMap,
      courtDetailsList,
      consecutiveToDetails,
    )

    return response.cases.map(courtCase => {
      const sentences = courtCase.sentences ?? []
      const sentenceUuidsInThisCase = new Set(sentences.map(s => s.sentenceUuid).filter(Boolean) as string[])

      const decorate = (s: RecallableCourtCaseSentence): SentenceAndOffence => {
        const offenceDescription = s.offenceCode ? (offenceMap.get(s.offenceCode) ?? null) : null

        const fullConsecutiveTo = s.consecutiveToSentenceUuid
          ? (consecutiveToDetailsBySentenceUuid.get(s.consecutiveToSentenceUuid) ?? null)
          : null

        const consecutiveTo =
          fullConsecutiveTo && s.consecutiveToSentenceUuid && sentenceUuidsInThisCase.has(s.consecutiveToSentenceUuid)
            ? {
                countNumber: fullConsecutiveTo.countNumber,
                offenceCode: fullConsecutiveTo.offenceCode,
                offenceDescription: fullConsecutiveTo.offenceDescription,
                offenceStartDate: fullConsecutiveTo.offenceStartDate,
                offenceEndDate: fullConsecutiveTo.offenceEndDate,
              }
            : fullConsecutiveTo

        return {
          ...s,
          offenceDescription,
          consecutiveTo,
        }
      }

      return {
        ...courtCase,
        recallableSentences: sentences.filter(s => s.isRecallable).map(decorate),
        nonRecallableSentences: sentences.filter(s => !s.isRecallable).map(decorate),
        courtName: courtDetailsList.find(c => c.courtId === courtCase.courtCode)?.courtName ?? '',
      }
    })
  }

  private async getConsecutiveToDetails<TSentence extends { consecutiveToSentenceUuid?: string | null }>(
    cases: { sentences?: TSentence[] }[],
    username: string,
  ): Promise<SentenceConsecutiveToDetailsResponse> {
    const consecutiveToSentenceUuids = [
      ...new Set(
        cases
          .flatMap(c => c.sentences ?? [])
          .map(s => s.consecutiveToSentenceUuid)
          .filter((uuid): uuid is string => !!uuid && uuid !== ''),
      ),
    ]

    if (!consecutiveToSentenceUuids.length) {
      return { sentences: [] }
    }

    return this.remandAndSentencingApiClient.getConsecutiveToDetails(consecutiveToSentenceUuids, username)
  }

  private async buildConsecutiveToDetailsMap(
    offenceMap: Map<string, string>,
    courtDetailsList: { courtId: string; courtName: string }[],
    consecutiveToDetails: SentenceConsecutiveToDetailsResponse,
  ): Promise<Map<string, ConsecutiveToDetails>> {
    return new Map(
      consecutiveToDetails.sentences.map(consecutiveSentence => [
        consecutiveSentence.sentenceUuid,
        {
          countNumber: consecutiveSentence.countNumber,
          offenceCode: consecutiveSentence.offenceCode,
          offenceDescription: offenceMap.get(consecutiveSentence.offenceCode) ?? null,
          courtCaseReference: consecutiveSentence.courtCaseReference ?? null,
          courtName: courtDetailsList.find(c => c.courtId === consecutiveSentence.courtCode)?.courtName ?? null,
          warrantDate: dayjs(consecutiveSentence.appearanceDate).format('DD/MM/YYYY'),
          offenceStartDate: consecutiveSentence.offenceStartDate
            ? dayjs(consecutiveSentence.offenceStartDate).format('DD/MM/YYYY')
            : null,
          offenceEndDate: consecutiveSentence.offenceEndDate
            ? dayjs(consecutiveSentence.offenceEndDate).format('DD/MM/YYYY')
            : null,
        } satisfies ConsecutiveToDetails,
      ]),
    )
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
    const consecutiveToDetails = await this.getConsecutiveToDetails(
      recalls.flatMap(r => r.courtCases ?? []),
      username,
    )
    const requiredPrisons = recalls.map(recall => recall.createdByPrison).filter(it => it)

    const requiredCourts = [
      ...new Set(
        recalls
          .flatMap(recall => (recall.courtCases ?? []).map(courtCase => courtCase.courtCode))
          .concat(consecutiveToDetails.sentences.map(s => s.courtCode))
          .filter((code): code is string => !!code && code !== ''),
      ),
    ]

    const requiredOffences = [
      ...new Set(
        recalls
          .flatMap(recall => recall.courtCases ?? [])
          .flatMap(courtCase => (courtCase.sentences ?? []).map(s => s.offenceCode))
          .concat(consecutiveToDetails.sentences.map(s => s.offenceCode))
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

    const offenceMap = new Map(offences.map(o => [o.code, o.description]))
    const consecutiveToDetailsBySentenceUuid = await this.buildConsecutiveToDetailsMap(
      offenceMap,
      courts,
      consecutiveToDetails,
    )

    return recalls.map(recall =>
      this.toExistingRecall(
        recall,
        prisons,
        courts,
        offences,
        isEditableAndDeletable,
        consecutiveToDetailsBySentenceUuid,
      ),
    )
  }

  private toExistingRecall(
    recall: ApiRecall,
    prisons: Prison[],
    courts: Court[],
    offences: Offence[],
    isEditableAndDeletable: (recall: ApiRecall) => boolean = () => false,
    consecutiveToDetailsBySentenceUuid: Map<string, ConsecutiveToDetails> = new Map(),
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
      courtCases: (recall.courtCases ?? []).map(courtCase => {
        const sentenceUuidsInThisCase = new Set(courtCase.sentences.map(s => s.sentenceUuid))

        return {
          courtCaseReference: courtCase.courtCaseReference,
          courtCaseUuid: courtCase.courtCaseUuid,
          courtName: courtCase.courtCode
            ? courts.find(court => court.courtId === courtCase.courtCode)?.courtName
            : undefined,
          courtCaseDate: courtCase.sentencingAppearanceDate,
          sentences: courtCase.sentences.map(sentence => {
            sentenceIds.push(sentence.sentenceUuid)

            const fullConsecutiveTo =
              sentence.consecutiveToSentenceUuid &&
              consecutiveToDetailsBySentenceUuid.get(sentence.consecutiveToSentenceUuid)

            const consecutiveTo =
              fullConsecutiveTo &&
              sentence.consecutiveToSentenceUuid &&
              sentenceUuidsInThisCase.has(sentence.consecutiveToSentenceUuid)
                ? {
                    countNumber: fullConsecutiveTo.countNumber,
                    offenceCode: fullConsecutiveTo.offenceCode,
                    offenceDescription: fullConsecutiveTo.offenceDescription,
                    offenceStartDate: fullConsecutiveTo.offenceStartDate,
                    offenceEndDate: fullConsecutiveTo.offenceEndDate,
                  }
                : fullConsecutiveTo

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
              consecutiveTo,
            }
          }),
        }
      }),
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

  async hasSentences(prisonerId: string, username: string): Promise<boolean> {
    return this.remandAndSentencingApiClient.hasSentences(prisonerId, username)
  }

  async fixManyCharges(prisonerId: string, username: string): Promise<void> {
    return this.remandAndSentencingApiClient.fixManyCharges(prisonerId, username)
  }
}
