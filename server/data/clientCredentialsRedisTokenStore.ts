import { RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import { RedisClientType } from 'redis'
import ClientCredentialsTokenStore from './clientCredentialsTokenStore'

export default class ClientCredentialsRedisTokenStore implements ClientCredentialsTokenStore {
  private readonly delegate: RedisTokenStore

  private readonly prefix = 'systemToken'

  constructor(private readonly client: RedisClientType) {
    this.delegate = new RedisTokenStore(client, this.prefix)
  }

  private async ensureConnected() {
    if (!this.client.isOpen) await this.client.connect()
  }

  async setToken(key: string, token: string, durationSeconds: number): Promise<void> {
    return this.delegate.setToken(key, token, durationSeconds)
  }

  async getToken(key: string): Promise<string | null> {
    return this.delegate.getToken(key)
  }

  async evictToken(key: string): Promise<void> {
    await this.ensureConnected()
    await this.client.del(`${this.prefix}:${key}`)
  }
}
