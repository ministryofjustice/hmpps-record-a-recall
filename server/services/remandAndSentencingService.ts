import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import { ApiRecall } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RemandAndSentencingService {
  constructor(private readonly remandAndSentencingApiClient: RemandAndSentencingApiClient) {}

  async getAllRecalls(nomsId: string, username: string): Promise<ApiRecall[]> {
    return this.remandAndSentencingApiClient.getAllRecalls(nomsId, username)
  }
}
