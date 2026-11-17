import { AdjustmentDto } from '../@types/adjustmentsApi'
import AdjustmentsApiClient from '../data/adjustmentsApiClient'

export default class AdjustmentsService {
  constructor(private readonly adjustmentsApiClient: AdjustmentsApiClient) {}

  async getAdjustmentById(adjustmentId: string, username: string): Promise<AdjustmentDto> {
    return this.adjustmentsApiClient.getAdjustmentById(adjustmentId, username)
  }
}
