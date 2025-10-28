import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'

export default class RecallService {
  constructor(
    private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient,
    private readonly manageOffencesApiClient: ManageOffencesApiClient,
  ) {}

  public async getRecallableCourtCases(prisonerId: string): Promise<
    Array<
      RecallableCourtCase & {
        recallableSentences: RecallableCourtCaseSentence[]
        nonRecallableSentences: RecallableCourtCaseSentence[]
      }
    >
  > {
    // offenceMap = await manageOffencesService.getOffenceMap(uniqueOffenceCodes, userToken)
    const response = await this.remandAndSentencingApiClient.getRecallableCourtCases(prisonerId)

    const offenceCodes = response.cases
      .flatMap(c => (c.sentences ?? []).map(s => s.offenceCode))
      .filter(code => code && code !== '')

    const offences = await this.manageOffencesApiClient.getOffencesByCodes(offenceCodes)

    offences.forEach(offence => offence.description)

    const cases = response.cases.map(c => ({
      ...c,
      recallableSentences: (c.sentences ?? [])
        .filter(s => s.isRecallable)
        .map(s => ({
          ...s,
          offenceDescription: offences.find(o => o.code === s.offenceCode)?.description || null,
        })),
      nonRecallableSentences: (c.sentences ?? [])
        .filter(s => !s.isRecallable)
        .map(s => ({
          ...s,
          offenceDescription: offences.find(o => o.code === s.offenceCode)?.description || null,
        })),
    }))

    return cases
  }
}
