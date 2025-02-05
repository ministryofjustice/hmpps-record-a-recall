import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  ApiRecall,
  ApiCourtCasePage,
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

  async getRecall(recallId: string): Promise<ApiRecall> {
    return this.restClient.get({
      path: `/recall/${recallId}`,
    }) as Promise<ApiRecall>
  }

  async updateRecall(recallId: string, createRecall: CreateRecall): Promise<CreateRecallResponse> {
    return this.restClient.put({
      data: createRecall,
      path: `/recall/${recallId}`,
    }) as Promise<CreateRecallResponse>
  }

  async getAllRecalls(prisonerId: string): Promise<ApiRecall[]> {
    return this.restClient.get({
      path: `/recall/person/${prisonerId}`,
    }) as Promise<ApiRecall[]>
  }

  async getCourtCases(prisonerId: string, page: number = 0): Promise<ApiCourtCasePage> {
    return this.restClient.get({
      path: `/court-case/search`,
      query: { prisonerId, sort: 'latestCourtAppearance_appearanceDate,desc', size: 20, page },
    }) as Promise<ApiCourtCasePage>
  }
}
