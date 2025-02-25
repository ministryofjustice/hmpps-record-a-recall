import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'

export default class AdjustmentsApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Adjustments API', config.apis.adjustmentsApi as ApiConfig, token)
  }

  async postAdjustment(adjustment: AdjustmentDto): Promise<CreateResponse> {
    return this.restClient.post({
      data: adjustment,
      path: `/adjustments`,
    }) as Promise<CreateResponse>
  }
}
