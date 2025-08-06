import type { CourtCase } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  RecallableCourtCase,
  RecallableCourtCasesResponse,
  UpdateSentenceTypesRequest,
  UpdateSentenceTypesResponse,
  SentenceType,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class CourtCaseService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getAllCourtCases(nomsId: string, username: string): Promise<CourtCase[]> {
    const response = await this.getAllRecallableCourtCases(nomsId, username)
    return response.cases.map((recallableCase: RecallableCourtCase) => this.fromRecallableCourtCase(recallableCase))
  }

  async getAllRecallableCourtCases(nomsId: string, username: string): Promise<RecallableCourtCasesResponse> {
    return (await this.getApiClient(username)).getRecallableCourtCases(nomsId)
  }

  async updateSentenceTypes(
    courtCaseUuid: string,
    payload: UpdateSentenceTypesRequest,
    username: string,
  ): Promise<UpdateSentenceTypesResponse> {
    return (await this.getApiClient(username)).updateSentenceTypes(courtCaseUuid, payload)
  }

  async searchSentenceTypes(
    params: {
      age: number
      convictionDate: string
      offenceDate: string
      statuses?: ('ACTIVE' | 'INACTIVE')[]
    },
    username: string,
  ): Promise<SentenceType[]> {
    return (await this.getApiClient(username)).searchSentenceTypes(params)
  }

  private async getApiClient(username: string): Promise<RemandAndSentencingApiClient> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  fromRecallableCourtCase(recallableCase: RecallableCourtCase & { courtName?: string }): CourtCase {
    console.log('recallablecase.sentences', JSON.stringify(recallableCase.sentences, undefined, 2))
    return {
      caseId: recallableCase.courtCaseUuid,
      status: recallableCase.status,
      date: recallableCase.date,
      location: recallableCase.courtCode,
      locationName: recallableCase.courtName,
      reference: recallableCase.reference,
      sentenced: recallableCase.isSentenced,
      sentences: recallableCase.sentences || [],
    }
  }
}
