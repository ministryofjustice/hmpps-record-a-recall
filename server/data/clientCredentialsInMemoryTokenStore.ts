import ClientCredentialsTokenStore from './clientCredentialsTokenStore'

export default class ClientCredentialsInMemoryTokenStore implements ClientCredentialsTokenStore {
  private readonly map = new Map<string, { token: string; expiry: number }>()

  async setToken(key: string, token: string, durationSeconds: number): Promise<void> {
    this.map.set(key, { token, expiry: Date.now() + durationSeconds * 1000 })
  }

  async getToken(key: string): Promise<string | null> {
    const entry = this.map.get(key)
    if (!entry || entry.expiry < Date.now()) return null
    return entry.token
  }

  async evictToken(key: string): Promise<void> {
    this.map.delete(key)
  }
}
