import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import { SentenceAndOffence } from '../@types/recallTypes'

export default class RecallService {
  constructor(
    private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient,
    private readonly manageOffencesApiClient: ManageOffencesApiClient,
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
}
