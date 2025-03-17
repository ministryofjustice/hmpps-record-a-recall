import type { UAL } from 'models'
import { HmppsAuthClient } from '../data'
import AdjustmentsApiClient from '../api/adjustmentsApiClient'
import { AdjustmentDto, CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { formatDate } from '../utils/utils'

export default class AdjustmentsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async postUal(ual: UAL, username: string): Promise<CreateResponse> {
    const adjustmentToCreate: AdjustmentDto = {
      bookingId: Number(ual.bookingId),
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      person: ual.nomisId,
      toDate: formatDate(new Date(ual.lastDay)),
      fromDate: formatDate(new Date(ual.firstDay)),
      unlawfullyAtLarge: {
        type: 'RECALL',
      },
    }
    return (await this.getApiClient(username)).postAdjustments([adjustmentToCreate])
  }

  async updateUal(ual: UAL, username: string, adjustmentId: string): Promise<CreateResponse> {
    const adjustmentToUpdate: AdjustmentDto = {
      id: adjustmentId,
      bookingId: Number(ual.bookingId),
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      person: ual.nomisId,
      toDate: formatDate(new Date(ual.lastDay)),
      fromDate: formatDate(new Date(ual.firstDay)),
      unlawfullyAtLarge: {
        type: 'RECALL',
      },
    }
    return (await this.getApiClient(username)).updateAdjustment(adjustmentId, adjustmentToUpdate)
  }

  async searchUal(nomisId: string, username: string): Promise<AdjustmentDto[]> {
    return (await this.getApiClient(username)).getAdjustments(nomisId)
  }

  private async getApiClient(username: string): Promise<AdjustmentsApiClient> {
    return new AdjustmentsApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
