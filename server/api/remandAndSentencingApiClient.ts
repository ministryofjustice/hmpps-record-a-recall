import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  RecallableCourtCase,
  RecallableCourtCasesResponse,
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

  async deleteRecall(recallId: string): Promise<void> {
    await this.restClient.delete({
      path: `/recall/${recallId}`,
    })
  }

  async getRecallableCourtCases(prisonerId: string): Promise<RecallableCourtCasesResponse> {
    return this.restClient.get({
      path: `/court-case/${prisonerId}/recallable-court-cases`,
    }) as Promise<RecallableCourtCasesResponse>
  }
}
