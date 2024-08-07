import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RemandAndSentencingApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient(
      'Remand and sentencing  API',
      config.apis.remandAndSentencingApi as ApiConfig,
      token,
    )
  }

  async postRecall(createRecall: CreateRecall): Promise<CreateRecallResponse> {
    return this.restClient.post({
      data: createRecall,
      path: `/recall`,
    }) as Promise<CreateRecallResponse>
  }

  async getAllRecalls(prisonerId: string): Promise<ApiRecall[]> {
    return this.restClient.get({
      path: `/recall/person/${prisonerId}`,
    }) as Promise<ApiRecall[]>
  }
}
