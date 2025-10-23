import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import AdjustmentsApiClient from './adjustmentsApiClient'
import nock from 'nock'
import config from '../config'

describe('AdjustmentsApiClient', () => {
  let adjustmentsApiClient: AdjustmentsApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    adjustmentsApiClient = new AdjustmentsApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('deleteAdjustment', () => {
    it('should call restClient.delete with the correct path', async () => {
      const adjustmentId = 'some-uuid'
      nock(config.apis.adjustmentsApi.url)
        .delete(`/adjustments/${adjustmentId}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, {})

      const response = await adjustmentsApiClient.deleteAdjustment(adjustmentId)

      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
