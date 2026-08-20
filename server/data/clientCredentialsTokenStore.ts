import { TokenStore } from '@ministryofjustice/hmpps-auth-clients'

export default interface ClientCredentialsTokenStore extends TokenStore {
  evictToken(key: string): Promise<void>
}
