import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'

export default class AdjustmentsApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Adjustments API', config.apis.adjustmentsApi as ApiConfig, token)
  }

  async postAdjustments(adjustments: AdjustmentDto[]): Promise<CreateResponse> {
    return this.restClient.post({
      data: adjustments,
      path: `/adjustments`,
    }) as Promise<CreateResponse>
  }

  // updating just one or many? yes or promise.all later
  async updateAdjustment(adjustmentId: string, adjustment: AdjustmentDto): Promise<CreateResponse> {
    return this.restClient.put({
      data: adjustment,
      path: `/adjustments/${adjustmentId}`,
    }) as Promise<CreateResponse>
  }

  async getAdjustments(person: string): Promise<AdjustmentDto[]> {
    return this.restClient.get({
      query: {
        person,
      },
      path: `/adjustments`,
    }) as Promise<AdjustmentDto[]>
  }
}
