import RecallService from './recallService'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import { RecallableCourtCase } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'

jest.mock('../data/remandAndSentencingApiClient')
jest.mock('../data/manageOffencesApiClient')

const remandAndSentencingApiClient = new RemandAndSentencingApiClient(null) as jest.Mocked<RemandAndSentencingApiClient>
const manageOffencesApiClient = new ManageOffencesApiClient(null) as jest.Mocked<ManageOffencesApiClient>

let service: RecallService

beforeEach(() => {
  jest.resetAllMocks()
  service = new RecallService(remandAndSentencingApiClient, manageOffencesApiClient)
})

describe('getRecallableCourtCases', () => {
  it('adds offenceDescription to recallable and non-recallable sentences', async () => {
    // Given
    remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
      cases: [
        {
          courtCaseUuid: 'cc-1',
          sentences: [
            { offenceCode: 'A1', isRecallable: true },
            { offenceCode: 'B2', isRecallable: false },
          ],
        } as RecallableCourtCase,
      ],
    })

    manageOffencesApiClient.getOffencesByCodes.mockResolvedValue([
      { code: 'A1', description: 'Assault' } as Offence,
      { code: 'B2', description: 'Burglary' } as Offence,
    ])

    // When
    const result = await service.getRecallableCourtCases('A1234BC')

    // Then
    expect(manageOffencesApiClient.getOffencesByCodes).toHaveBeenCalledWith(['A1', 'B2'])
    expect(result).toHaveLength(1)

    const [courtCase] = result
    expect(courtCase.recallableSentences[0].offenceDescription).toBe('Assault')
    expect(courtCase.nonRecallableSentences[0].offenceDescription).toBe('Burglary')
  })
})
