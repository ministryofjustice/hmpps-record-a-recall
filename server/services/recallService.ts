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
    const options: FormatDistanceStrictOptions = { unit: 'day', roundingMethod: 'trunc' }

    return allApiRecalls.map((apiRecall: ApiRecall): Recall => {
      const { recallDate, returnToCustodyDate, recallType } = apiRecall
      return {
        recallDate: new Date(recallDate),
        returnToCustodyDate: new Date(returnToCustodyDate),
        recallType: RecallTypes[recallType],
        // TODO UAL should be stored on the recall in RaS not calculated on the fly
        ual: formatDistanceStrict(recallDate, returnToCustodyDate, options),
      }
    })
  }
}
