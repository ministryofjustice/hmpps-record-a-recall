import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import config from '../config'
import logger from '../../logger'

export default class AdjustmentsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Adjustments API', config.apis.adjustmentsApi, logger, authenticationClient)
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
