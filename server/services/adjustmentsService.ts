import type { UAL } from 'models'
import { HmppsAuthClient } from '../data'
import AdjustmentsApiClient from '../api/adjustmentsApiClient'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { formatDate } from '../utils/utils'

export default class AdjustmentsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async postUal(ual: UAL, username: string): Promise<CreateResponse> {
    const adjustmentToCreate: AdjustmentDto = {
      bookingId: ual.bookingId,
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      person: ual.nomisId,
      toDate: formatDate(ual.returnToCustodyDate),
      fromDate: formatDate(ual.recallDate),
      days: ual.days,
      unlawfullyAtLarge: {
        type: 'RECALL',
      },
    }
    return (await this.getApiClient(username)).postAdjustments([adjustmentToCreate])
  }

  private async getApiClient(username: string): Promise<AdjustmentsApiClient> {
    return new AdjustmentsApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
