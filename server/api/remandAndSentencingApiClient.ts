import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  UpdateSentenceTypesRequest,
  UpdateSentenceTypesResponse,
  SentenceType,
  RecallableCourtCasesResponseAugmented,
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

  async getRecallableCourtCases(prisonerId: string): Promise<RecallableCourtCasesResponseAugmented> {
    return this.restClient.get({
      path: `/court-case/${prisonerId}/recallable-court-cases`,
    }) as Promise<RecallableCourtCasesResponseAugmented>
  }

  async updateSentenceTypes(
    courtCaseUuid: string,
    data: UpdateSentenceTypesRequest,
  ): Promise<UpdateSentenceTypesResponse> {
    return this.restClient.post({
      path: `/court-case/${courtCaseUuid}/sentences/update-types`,
      data,
    }) as Promise<UpdateSentenceTypesResponse>
  }

  async searchSentenceTypes(params: {
    age: number
    convictionDate: string
    offenceDate: string
    statuses?: ('ACTIVE' | 'INACTIVE')[]
  }): Promise<SentenceType[]> {
    return this.restClient.get({
      path: `/sentence-type/search`,
      query: {
        age: params.age,
        convictionDate: params.convictionDate,
        offenceDate: params.offenceDate,
        statuses: params.statuses,
      },
    }) as Promise<SentenceType[]>
  }
}
