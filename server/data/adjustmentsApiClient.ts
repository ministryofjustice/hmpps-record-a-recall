import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import config from '../config'
import logger from '../../logger'

export default class AdjustmentsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Adjustments API', config.apis.adjustmentsApi, logger, authenticationClient)
  }

  async postAdjustments(adjustments: AdjustmentDto[]): Promise<CreateResponse> {
    return this.post(
      {
        data: adjustments,
        path: `/adjustments`,
      },
      asSystem(),
    ) as Promise<CreateResponse>
  }

  async updateAdjustment(adjustmentId: string, adjustment: AdjustmentDto): Promise<CreateResponse> {
    return this.put(
      {
        data: adjustment,
        path: `/adjustments/${adjustmentId}`,
      },
      asSystem(),
    ) as Promise<CreateResponse>
  }

  async getAdjustments(person: string, recallUuid?: string): Promise<AdjustmentDto[]> {
    return this.get(
      {
        query: {
          person,
          recallId: recallUuid,
        },
        path: `/adjustments`,
      },
      asSystem(),
    ) as Promise<AdjustmentDto[]>
  }

  async deleteAdjustment(adjustmentId: string): Promise<void> {
    await this.delete(
      {
        path: `/adjustments/${adjustmentId}`,
      },
      asSystem(),
    )
  }
}
