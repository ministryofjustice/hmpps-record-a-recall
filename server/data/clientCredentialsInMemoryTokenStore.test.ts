import ClientCredentialsInMemoryTokenStore from './clientCredentialsInMemoryTokenStore'

describe('ClientCredentialsInMemoryTokenStore', () => {
  let store: ClientCredentialsInMemoryTokenStore

  beforeEach(() => {
    store = new ClientCredentialsInMemoryTokenStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns null when no token has been stored for a key', async () => {
    await expect(store.getToken('user1')).resolves.toBeNull()
  })

  it('returns a stored token before it expires', async () => {
    await store.setToken('user1', 'abc123', 3600)
    await expect(store.getToken('user1')).resolves.toBe('abc123')
  })

  it('returns null once the token has expired', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await store.setToken('user1', 'abc123', 10)

    jest.setSystemTime(new Date('2026-01-01T00:00:11Z'))

    await expect(store.getToken('user1')).resolves.toBeNull()
  })

  it('keys tokens independently per user', async () => {
    await store.setToken('user1', 'tokenA', 3600)
    await store.setToken('user2', 'tokenB', 3600)

    await expect(store.getToken('user1')).resolves.toBe('tokenA')
    await expect(store.getToken('user2')).resolves.toBe('tokenB')
  })

  it('removes a token on eviction', async () => {
    await store.setToken('user1', 'abc123', 3600)
    await store.evictToken('user1')

    await expect(store.getToken('user1')).resolves.toBeNull()
  })

  it('evicting a key that was never set is a no-op', async () => {
    await expect(store.evictToken('never-set')).resolves.toBeUndefined()
  })
})
