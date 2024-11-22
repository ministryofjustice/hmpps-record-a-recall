import nock from 'nock'
import CalculationService from './calculationService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import { CalculatedReleaseDates } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

jest.mock('../data/hmppsAuthClient')

describe('CalculationService service', () => {
  let fakeCalculateReleaseDatesApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let calculationService: CalculationService

  beforeEach(() => {
    fakeCalculateReleaseDatesApi = nock(config.apis.calculateReleaseDatesApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    calculationService = new CalculationService(hmppsAuthClient)
  })

  describe('calculateReleaseDates', () => {
    it('Request a temporrary calculation', async () => {
      const nomsId = 'A1234BC'

      const calculationResults = { calculationRequestId: 'uuid-returned' } as unknown as CalculatedReleaseDates
      fakeCalculateReleaseDatesApi.post(`/calculation/record-a-recall/${nomsId}`).reply(200, calculationResults)

      const calculation = await calculationService.getTemporaryCalculation(nomsId, 'user11')

      expect(calculation).toEqual(calculationResults)

      // Ensure that no further API calls were made
      expect(fakeCalculateReleaseDatesApi.isDone()).toBe(true)
    })
  })
})
