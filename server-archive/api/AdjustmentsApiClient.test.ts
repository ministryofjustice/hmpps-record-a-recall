import AdjustmentsApiClient from './adjustmentsApiClient'
import RestClient from '../data/restClient'

describe('AdjustmentsApiClient', () => {
  let adjustmentsApiClient: AdjustmentsApiClient
  const mockToken = 'test-token'
  let restClientDeleteMock: jest.SpyInstance

  beforeEach(() => {
    restClientDeleteMock = jest.spyOn(RestClient.prototype, 'delete')
    adjustmentsApiClient = new AdjustmentsApiClient(mockToken)
  })

  afterEach(() => {
    restClientDeleteMock.mockRestore()
  })

  describe('deleteAdjustment', () => {
    it('should call restClient.delete with the correct path', async () => {
      const adjustmentId = 'some-uuid'
      restClientDeleteMock.mockResolvedValue(undefined)

      await adjustmentsApiClient.deleteAdjustment(adjustmentId)

      expect(restClientDeleteMock).toHaveBeenCalledWith({
        path: `/adjustments/${adjustmentId}`,
      })
    })

    it('should resolve when delete is successful', async () => {
      const adjustmentId = 'some-uuid'
      restClientDeleteMock.mockResolvedValue(undefined)

      await expect(adjustmentsApiClient.deleteAdjustment(adjustmentId)).resolves.toBeUndefined()
    })

    it('should reject if restClient.delete throws an error', async () => {
      const adjustmentId = 'some-uuid'
      const error = new Error('API Error')
      restClientDeleteMock.mockRejectedValue(error)

      await expect(adjustmentsApiClient.deleteAdjustment(adjustmentId)).rejects.toThrow(error)
    })
  })
})
