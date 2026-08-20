import { RedisClientType } from 'redis'
import ClientCredentialsRedisTokenStore from './clientCredentialsRedisTokenStore'

describe('ClientCredentialsRedisTokenStore', () => {
  let mockClient: { isOpen: boolean; connect: jest.Mock; get: jest.Mock; set: jest.Mock; del: jest.Mock }
  let store: ClientCredentialsRedisTokenStore

  beforeEach(() => {
    mockClient = {
      isOpen: true,
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    }

    store = new ClientCredentialsRedisTokenStore(mockClient as unknown as RedisClientType)
  })

  it('stores tokens under the systemToken prefix with the given TTL', async () => {
    await store.setToken('user1', 'abc123', 3600)
    expect(mockClient.set).toHaveBeenCalledWith('systemToken:user1', 'abc123', { EX: 3600 })
  })

  it('retrieves tokens from under the systemToken prefix', async () => {
    mockClient.get.mockResolvedValue('abc123')
    await expect(store.getToken('user1')).resolves.toBe('abc123')
    expect(mockClient.get).toHaveBeenCalledWith('systemToken:user1')
  })

  it('returns null when no token is cached', async () => {
    mockClient.get.mockResolvedValue(null)
    await expect(store.getToken('user1')).resolves.toBeNull()
  })

  describe('evictToken', () => {
    it('deletes the token using the same key format used by setToken/getToken', async () => {
      await store.evictToken('user1')
      expect(mockClient.del).toHaveBeenCalledWith('systemToken:user1')
    })

    it('connects first if the client is not already open', async () => {
      mockClient.isOpen = false
      await store.evictToken('user1')
      expect(mockClient.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.del).toHaveBeenCalledWith('systemToken:user1')
    })

    it('does not reconnect if the client is already open', async () => {
      mockClient.isOpen = true
      await store.evictToken('user1')
      expect(mockClient.connect).not.toHaveBeenCalled()
    })
  })

  it('keys entries independently per user', async () => {
    await store.setToken('user1', 'tokenA', 3600)
    await store.setToken('user2', 'tokenB', 3600)

    expect(mockClient.set).toHaveBeenNthCalledWith(1, 'systemToken:user1', 'tokenA', { EX: 3600 })
    expect(mockClient.set).toHaveBeenNthCalledWith(2, 'systemToken:user2', 'tokenB', { EX: 3600 })
  })
})
