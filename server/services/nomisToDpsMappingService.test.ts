import NomisToDpsMappingService from './nomisToDpsMappingService'
import { HmppsAuthClient } from '../data'
import NomisMappingServiceApiClient from '../api/nomisMappingServiceApiClient'
import { NomisSentenceId, NomisDpsSentenceMapping } from '../@types/nomisMappingApi/nomisMappingApiTypes'

jest.mock('../data')
jest.mock('../api/nomisMappingServiceApiClient')

describe('NomisToDpsMappingService', () => {
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let mappingService: NomisToDpsMappingService
  let nomisMappingServiceApiClient: jest.Mocked<NomisMappingServiceApiClient>

  const username = 'test-user'
  const token = 'system-token'

  beforeEach(() => {
    hmppsAuthClient = {
      getSystemClientToken: jest.fn().mockResolvedValue(token),
    } as unknown as jest.Mocked<HmppsAuthClient>

    nomisMappingServiceApiClient = {
      postNomisToDpsMappingLookup: jest.fn(),
    } as unknown as jest.Mocked<NomisMappingServiceApiClient>
    ;(NomisMappingServiceApiClient as jest.Mock).mockImplementation(() => nomisMappingServiceApiClient)

    mappingService = new NomisToDpsMappingService(hmppsAuthClient)
  })

  describe('getNomisToDpsMappingLookup', () => {
    it('gets token and calls the API client with the sentence mapping input', async () => {
      const mappings: NomisSentenceId[] = [
        { nomisSentenceSequence: 1, nomisBookingId: 1154003 },
        { nomisSentenceSequence: 2, nomisBookingId: 1154003 },
      ]

      const expectedResponse: NomisDpsSentenceMapping[] = [
        {
          nomisSentenceId: { nomisSentenceSequence: 1, nomisBookingId: 1154003 },
          dpsSentenceId: 'uuid-1',
        },
        {
          nomisSentenceId: { nomisSentenceSequence: 2, nomisBookingId: 1154003 },
          dpsSentenceId: 'uuid-2',
        },
      ]

      nomisMappingServiceApiClient.postNomisToDpsMappingLookup.mockResolvedValue(expectedResponse)

      const result = await mappingService.getNomisToDpsMappingLookup(mappings, username)

      expect(hmppsAuthClient.getSystemClientToken).toHaveBeenCalledWith(username)
      expect(nomisMappingServiceApiClient.postNomisToDpsMappingLookup).toHaveBeenCalledWith(mappings)
      expect(result).toEqual(expectedResponse)
    })
  })
})
