import type { Recall } from 'models'
import { formatDistanceStrict, FormatDistanceStrictOptions } from 'date-fns'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { RecallTypes } from '../@types/recallTypes'
import { calculateUal } from '../utils/utils'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async postRecall(recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username)).postRecall(recall)
  }

  async getAllRecalls(nomsId: string, username: string): Promise<Recall[]> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
    const allApiRecalls = await client.getAllRecalls(nomsId)

    return allApiRecalls.map((apiRecall: ApiRecall): Recall => {
      const { recallDate, returnToCustodyDate, recallType } = apiRecall
      // TODO UAL should be stored on the recall in RaS not calculated on the fly
      const ual = calculateUal(recallDate, returnToCustodyDate)
      return {
        recallDate: new Date(recallDate),
        returnToCustodyDate: new Date(returnToCustodyDate),
        recallType: RecallTypes[recallType],
        ual: `${ual} day${ual === 1 ? '' : 's'}`,
      }
    })
  }
}
