import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
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

export default class RecallService {
  constructor(
    private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient,
    private readonly manageOffencesApiClient: ManageOffencesApiClient,
    private readonly prisonRegisterApiClient: PrisonRegisterApiClient,
    private readonly courtRegisterApiClient: CourtRegisterApiClient,
  ) {}

  public async getRecallableCourtCases(prisonerId: string): Promise<
    Array<
      RecallableCourtCase & {
        recallableSentences: SentenceAndOffence[]
        nonRecallableSentences: SentenceAndOffence[]
      }
    >
  > {
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
    const latestRecallUuid = sortedRecalls.length > 0 ? sortedRecalls[0].recallUuid : undefined
    return sortedRecalls.map(recall => this.toExistingRecall(recall, prisons, courts, offences, latestRecallUuid))
  }

  private toExistingRecall(
    recall: ApiRecall,
    prisons: Prison[],
    courts: Court[],
    offences: Offence[],
    latestRecallUuid: string,
  ): ExistingRecall {
    const isLatestAndDPSRecall = recall.source === 'DPS' && recall.recallUuid === latestRecallUuid
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
}
