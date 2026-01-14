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
      expect(result).toStrictEqual({
        sled: '2025-01-02',
        sledExists: true,
      })
    })

    it('returns LED date when present and no SLED', async () => {
      calculateReleaseDatesApiClient.getLatestCalculation.mockResolvedValue({
        dates: [{ type: 'LED', date: '2025-01-03' }],
      } as LatestCalculation)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toStrictEqual({
        led: '2025-01-03',
        sed: undefined,
        sledExists: false,
      })
    })

    it('returns undefined when API returns 404', async () => {
      const error = { responseStatus: 404 }
      calculateReleaseDatesApiClient.getLatestCalculation.mockRejectedValue(error)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toBeUndefined()
    })

    it('returns SED and LED and sets sledExists to true when no SLED and SED and LED differ', async () => {
      calculateReleaseDatesApiClient.getLatestCalculation.mockResolvedValue({
        dates: [
          { type: 'SED', date: '2025-01-01' },
          { type: 'LED', date: '2025-02-01' },
        ],
      } as LatestCalculation)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toStrictEqual({
        sed: '2025-01-01',
        led: '2025-02-01',
        sledExists: false,
      })
    })

    it('returns SED and LED and sets sledExists to false when no SLED and SED and LED are the same date', async () => {
      calculateReleaseDatesApiClient.getLatestCalculation.mockResolvedValue({
        dates: [
          { type: 'SED', date: '2025-01-01' },
          { type: 'LED', date: '2025-01-01' },
        ],
      } as LatestCalculation)

      const result = await service.getLicenceDatesFromLatestCalc('A1234BC')

      expect(calculateReleaseDatesApiClient.getLatestCalculation).toHaveBeenCalledWith('A1234BC')
      expect(result).toStrictEqual({
        sed: '2025-01-01',
        led: '2025-01-01',
        sledExists: false,
      })
    })
  })
})
