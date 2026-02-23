import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
  UpdateSentenceTypesRequest,
  UpdateSentenceTypesResponse,
  SentenceType,
  RecallableCourtCasesResponseAugmented,
  IsRecallPossibleRequest,
  IsRecallPossibleResponse,
  SentenceConsecutiveToDetailsResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../logger'
import config from '../config'

export default class RemandAndSentencingApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Remand and sentencing  API', config.apis.remandAndSentencingApi, logger, authenticationClient)
  }

  async createRecall(createRecall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return this.post(
      {
        data: createRecall,
        path: `/recall`,
      },
      asSystem(username),
    ) as Promise<CreateRecallResponse>
  }

  async editRecall(recallId: string, createRecall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return this.put(
      {
        data: createRecall,
        path: `/recall/${recallId}`,
      },
      asSystem(username),
    ) as Promise<CreateRecallResponse>
  }

  async getRecall(recallId: string, username: string): Promise<ApiRecall> {
    return this.get(
      {
        path: `/recall/${recallId}`,
      },
      asSystem(username),
    ) as Promise<ApiRecall>
  }

  async updateRecall(recallId: string, createRecall: CreateRecall): Promise<CreateRecallResponse> {
    return this.put(
      {
        data: createRecall,
        path: `/recall/${recallId}`,
      },
      asSystem(),
    ) as Promise<CreateRecallResponse>
  }

  async getAllRecalls(prisonerId: string, username: string): Promise<ApiRecall[]> {
    return this.get(
      {
        path: `/recall/person/${prisonerId}`,
      },
      asSystem(username),
    ) as Promise<ApiRecall[]>
  }

  async deleteRecall(recallId: string, username: string): Promise<void> {
    await this.delete(
      {
        path: `/recall/${recallId}`,
      },
      asSystem(username),
    )
  }

  async getRecallableCourtCases(prisonerId: string): Promise<RecallableCourtCasesResponseAugmented> {
    return this.get(
      {
        path: `/court-case/${prisonerId}/recallable-court-cases`,
      },
      asSystem(),
    ) as Promise<RecallableCourtCasesResponseAugmented>
  }

  async updateSentenceTypes(
    courtCaseUuid: string,
    data: UpdateSentenceTypesRequest,
  ): Promise<UpdateSentenceTypesResponse> {
    return this.post(
      {
        path: `/court-case/${courtCaseUuid}/sentences/update-types`,
        data,
      },
      asSystem(),
    ) as Promise<UpdateSentenceTypesResponse>
  }

  async searchSentenceTypes(params: {
    age: number
    convictionDate: string
    offenceDate: string
    statuses?: ('ACTIVE' | 'INACTIVE')[]
  }): Promise<SentenceType[]> {
    return this.get(
      {
        path: `/sentence-type/search`,
        query: {
          age: params.age,
          convictionDate: params.convictionDate,
          offenceDate: params.offenceDate,
          statuses: params.statuses,
        },
      },
      asSystem(),
    ) as Promise<SentenceType[]>
  }

  async isRecallPossible(request: IsRecallPossibleRequest, username: string): Promise<IsRecallPossibleResponse> {
    return this.post(
      {
        path: `/recall/is-possible`,
        data: request,
      },
      asSystem(username),
    ) as Promise<IsRecallPossibleResponse>
  }

  async hasSentences(prisonerId: string, username: string): Promise<boolean> {
    return this.get<boolean>(
      {
        path: `/sentence/has-sentences/${prisonerId}`,
      },
      asSystem(username),
    )
  }

  async getConsecutiveToDetails(
    sentenceUuids: string[],
    username: string,
  ): Promise<SentenceConsecutiveToDetailsResponse> {
    return this.get(
      {
        path: '/sentence/consecutive-to-details',
        query: {
          sentenceUuids: sentenceUuids.join(','),
        },
      },
      asSystem(username),
    )
  }

  async fixManyCharges(prisonerId: string, username: string): Promise<void> {
    return this.put(
      {
        path: `/person/${prisonerId}/fix-many-charges-to-sentence`,
      },
      asSystem(username),
    )
  }
}
