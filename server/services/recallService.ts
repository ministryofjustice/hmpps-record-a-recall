import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RecallService {
  constructor(
      private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient
  ) {}

  public async getRecallableCourtCases(prisonerId: string): Promise<
    Array<
      RecallableCourtCase & {
        recallableSentences: RecallableCourtCaseSentence[]
        nonRecallableSentences: RecallableCourtCaseSentence[]
      }
    >
  > {
    offenceMap = await manageOffencesService.getOffenceMap(uniqueOffenceCodes, userToken)
    const response = await this.remandAndSentencingApiClient.getRecallableCourtCases(prisonerId)

    const cases = response.cases.map(c => ({
      ...c,
      recallableSentences: (c.sentences ?? []).filter(s => s.isRecallable),
      nonRecallableSentences: (c.sentences ?? []).filter(s => !s.isRecallable),
    }))

    return cases
  }
}
