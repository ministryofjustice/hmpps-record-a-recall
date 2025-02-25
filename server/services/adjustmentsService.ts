import { HmppsAuthClient } from '../data'
import AdjustmentsApiClient from '../api/adjustmentsApiClient'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'

export default class AdjustmentsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async postAdjustments(Adjustments: AdjustmentDto, username: string): Promise<CreateResponse> {
    return (await this.getApiClient(username)).postAdjustment(Adjustments)
  }

  private async getApiClient(username: string): Promise<AdjustmentsApiClient> {
    return new AdjustmentsApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
