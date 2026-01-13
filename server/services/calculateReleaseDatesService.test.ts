import CalculateReleaseDatesService from './calculateReleaseDatesService'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'
import { LatestCalculation } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

jest.mock('../data/calculateReleaseDatesApiClient')

const calculateReleaseDatesApiClient = new CalculateReleaseDatesApiClient(
  null,
) as jest.Mocked<CalculateReleaseDatesApiClient>

let service: CalculateReleaseDatesService

beforeEach(() => {
  jest.resetAllMocks()
  service = new CalculateReleaseDatesService(calculateReleaseDatesApiClient)
})

describe('Calculate release dates service', () => {
  describe('getLedFromLatestCalc', () => {
    it('returns SLED date when present', async () => {
      calculateReleaseDatesApiClient.getLatestCalculation.mockResolvedValue({
        dates: [
          { type: 'SLED', date: '2025-01-02' },
          { type: 'LED', date: '2025-01-03' },
        ],
      } as LatestCalculation)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toStrictEqual({ areDifferent: false, led: '2025-01-03', sed: undefined })
    })

    it('returns LED date when present and no SLED', async () => {
      calculateReleaseDatesApiClient.getLatestCalculation.mockResolvedValue({
        dates: [{ type: 'LED', date: '2025-01-03' }],
      } as LatestCalculation)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toStrictEqual({ areDifferent: false, led: '2025-01-03', sed: undefined })
    })

    it('returns undefined when API returns 404', async () => {
      const error = { responseStatus: 404 }
      calculateReleaseDatesApiClient.getLatestCalculation.mockRejectedValue(error)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toBeUndefined()
    })
  })
})
