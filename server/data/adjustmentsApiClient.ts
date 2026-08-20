import { asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import config from '../config'
import logger from '../../logger'
import ClientCredentialsRestClient from './clientCredentialsRestClient'
import ClientCredentialsTokenStore from './clientCredentialsTokenStore'

export default class AdjustmentsApiClient extends ClientCredentialsRestClient {
  constructor(authenticationClient: AuthenticationClient, systemTokenStore: ClientCredentialsTokenStore) {
    super('Adjustments API', config.apis.adjustmentsApi, logger, authenticationClient, systemTokenStore)
  }

  async getAdjustmentById(adjustmentId: string, username: string): Promise<AdjustmentDto> {
    return this.get(
      {
        path: `/adjustments/${adjustmentId}`,
      },
      asSystem(username),
    ) as Promise<AdjustmentDto>
  }
}
