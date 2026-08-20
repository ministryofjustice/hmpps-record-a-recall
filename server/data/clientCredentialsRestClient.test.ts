import { RestClient, AgentConfig, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { SanitisedError } from '@ministryofjustice/hmpps-rest-client'
import ClientCredentialsRestClient from './clientCredentialsRestClient'
import ClientCredentialsTokenStore from './clientCredentialsTokenStore'
import GrantType from './grantType'

jest.mock('@ministryofjustice/hmpps-rest-client', () => {
  const actual = jest.requireActual('@ministryofjustice/hmpps-rest-client')
  return {
    ...actual,
    RestClient: jest.fn(),
  }
})

const mockLogger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() }

function sanitisedError(responseStatus?: number): SanitisedError {
  const error = new Error('boom') as SanitisedError
  error.responseStatus = responseStatus
  return error
}

const apiConfig = {
  url: 'http://localhost',
  timeout: { response: 1000, deadline: 1000 },
  agent: new AgentConfig(),
}

describe('ClientCredentialsRestClient', () => {
  let mockUnderlyingClient: {
    get: jest.Mock
    post: jest.Mock
    put: jest.Mock
    patch: jest.Mock
    delete: jest.Mock
  }
  let tokenStore: jest.Mocked<ClientCredentialsTokenStore>
  let client: ClientCredentialsRestClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockUnderlyingClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    }
    ;(RestClient as unknown as jest.Mock).mockImplementation(() => mockUnderlyingClient)

    tokenStore = {
      setToken: jest.fn(),
      getToken: jest.fn(),
      evictToken: jest.fn(),
    }

    client = new ClientCredentialsRestClient('Test API', apiConfig, mockLogger as never, {} as never, tokenStore)
  })

  describe('successful calls', () => {
    it('passes the request straight through to the underlying RestClient.get', async () => {
      mockUnderlyingClient.get.mockResolvedValue({ some: 'data' })

      const result = await client.get({ path: '/foo' }, asSystem('user1'))

      expect(result).toEqual({ some: 'data' })
      expect(mockUnderlyingClient.get).toHaveBeenCalledTimes(1)
      const [requestArg, authOptionsArg] = mockUnderlyingClient.get.mock.calls[0]
      expect(requestArg.path).toBe('/foo')
      expect(authOptionsArg).toEqual(asSystem('user1'))
    })

    it('attaches a custom errorHandler to every request', async () => {
      mockUnderlyingClient.get.mockResolvedValue({})
      await client.get({ path: '/foo' }, asSystem('user1'))

      const [requestArg] = mockUnderlyingClient.get.mock.calls[0]
      expect(typeof requestArg.errorHandler).toBe('function')
    })
  })

  describe('error tagging', () => {
    it('tags errors thrown via the injected errorHandler with grantType CLIENT_CREDENTIALS', async () => {
      mockUnderlyingClient.get.mockImplementation(async (request: { errorHandler: (...args: unknown[]) => unknown }) =>
        request.errorHandler('/foo', 'GET', sanitisedError(500)),
      )

      await expect(client.get({ path: '/foo' }, asSystem('user1'))).rejects.toMatchObject({
        grantType: GrantType.SYSTEM_TOKEN,
      })
    })

    it('logs the error via the shared logger', async () => {
      mockUnderlyingClient.get.mockImplementation(async (request: { errorHandler: (...args: unknown[]) => unknown }) =>
        request.errorHandler('/foo', 'GET', sanitisedError(500)),
      )

      await expect(client.get({ path: '/foo' }, asSystem('user1'))).rejects.toThrow()
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  describe('token retry on 401/403', () => {
    it('evicts the cached token for the username and retries once on a 401', async () => {
      const error = sanitisedError(401)
      mockUnderlyingClient.get.mockRejectedValueOnce(error).mockResolvedValueOnce({ recovered: true })

      const result = await client.get({ path: '/foo' }, asSystem('user1'))

      expect(result).toEqual({ recovered: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')
      expect(mockUnderlyingClient.get).toHaveBeenCalledTimes(2)
    })

    it('evicts the cached token and retries once on a 403', async () => {
      const error = sanitisedError(403)
      mockUnderlyingClient.get.mockRejectedValueOnce(error).mockResolvedValueOnce({ recovered: true })

      const result = await client.get({ path: '/foo' }, asSystem('user1'))

      expect(result).toEqual({ recovered: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')
    })

    it('uses the %ANONYMOUS% key when no username is supplied to asSystem()', async () => {
      const error = sanitisedError(401)
      mockUnderlyingClient.get.mockRejectedValueOnce(error).mockResolvedValueOnce({})

      await client.get({ path: '/foo' }, asSystem())

      expect(tokenStore.evictToken).toHaveBeenCalledWith('%ANONYMOUS%')
    })

    it('only retries once — a second consecutive 401 propagates', async () => {
      const error = sanitisedError(401)
      mockUnderlyingClient.get.mockRejectedValue(error)

      await expect(client.get({ path: '/foo' }, asSystem('user1'))).rejects.toBe(error)
      expect(mockUnderlyingClient.get).toHaveBeenCalledTimes(2)
      expect(tokenStore.evictToken).toHaveBeenCalledTimes(1)
    })

    it('does not evict or retry on a non-401/403 error (e.g. 500)', async () => {
      const error = sanitisedError(500)
      mockUnderlyingClient.get.mockRejectedValueOnce(error)

      await expect(client.get({ path: '/foo' }, asSystem('user1'))).rejects.toBe(error)
      expect(tokenStore.evictToken).not.toHaveBeenCalled()
      expect(mockUnderlyingClient.get).toHaveBeenCalledTimes(1)
    })

    it('does not evict or retry when authOptions is a raw token string', async () => {
      const error = sanitisedError(401)
      mockUnderlyingClient.get.mockRejectedValueOnce(error)

      await expect(client.get({ path: '/foo' }, 'raw-jwt-token')).rejects.toBe(error)
      expect(tokenStore.evictToken).not.toHaveBeenCalled()
    })

    it('does not evict or retry when authOptions is undefined', async () => {
      const error = sanitisedError(401)
      mockUnderlyingClient.get.mockRejectedValueOnce(error)

      await expect(client.get({ path: '/foo' })).rejects.toBe(error)
      expect(tokenStore.evictToken).not.toHaveBeenCalled()
    })

    it('applies the same retry behaviour to post/put/patch/delete', async () => {
      const error = sanitisedError(401)

      mockUnderlyingClient.post.mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true })
      await expect(client.post({ path: '/foo', data: {} }, asSystem('user1'))).resolves.toEqual({ ok: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')

      tokenStore.evictToken.mockClear()
      mockUnderlyingClient.put.mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true })
      await expect(client.put({ path: '/foo', data: {} }, asSystem('user1'))).resolves.toEqual({ ok: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')

      tokenStore.evictToken.mockClear()
      mockUnderlyingClient.patch.mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true })
      await expect(client.patch({ path: '/foo', data: {} }, asSystem('user1'))).resolves.toEqual({ ok: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')

      tokenStore.evictToken.mockClear()
      mockUnderlyingClient.delete.mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true })
      await expect(client.delete({ path: '/foo' }, asSystem('user1'))).resolves.toEqual({ ok: true })
      expect(tokenStore.evictToken).toHaveBeenCalledWith('user1')
    })
  })
})
