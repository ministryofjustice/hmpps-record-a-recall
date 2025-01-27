import type { Recall } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { calculateUal } from '../utils/utils'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async postRecall(recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return (await this.getApiClient(username)).postRecall(recall)
  }

  async getRecall(recallId: string, username: string): Promise<Recall> {
    return this.fromApiRecall(await (await this.getApiClient(username)).getRecall(recallId))
  }

  async updateRecall(recallId: string, recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return (await this.getApiClient(username)).updateRecall(recallId, recall)
  }

  async getAllRecalls(nomsId: string, username: string): Promise<Recall[]> {
    const allApiRecalls = await (await this.getApiClient(username)).getAllRecalls(nomsId)

    return allApiRecalls.map((apiRecall: ApiRecall): Recall => this.fromApiRecall(apiRecall))
  }

  private async getApiClient(username: string): Promise<RemandAndSentencingApiClient> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  fromApiRecall(apiRecall: ApiRecall) {
    // TODO UAL should be stored on the recall in RaS not calculated on the fly
    const ual = calculateUal(apiRecall.revocationDate, apiRecall.returnToCustodyDate)
    return {
      recallId: apiRecall.recallUuid,
      createdAt: apiRecall.createdAt,
      recallDate: new Date(apiRecall.revocationDate),
      returnToCustodyDate: new Date(apiRecall.returnToCustodyDate),
      recallType: apiRecall.recallType,
      ual,
      ualString: `${ual} day${ual === 1 ? '' : 's'}`,
    }
  }
}
