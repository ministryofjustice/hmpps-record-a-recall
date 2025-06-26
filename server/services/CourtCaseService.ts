import type { CourtCase } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  RecallableCourtCase,
  RecallableCourtCasesResponse,
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

  private async getApiClient(username: string): Promise<RemandAndSentencingApiClient> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  fromRecallableCourtCase(recallableCase: RecallableCourtCase & { courtName?: string }): CourtCase {
    return {
      caseId: recallableCase.courtCaseUuid,
      status: recallableCase.status,
      date: recallableCase.date,
      location: recallableCase.courtCode,
      locationName: recallableCase.courtName, // Enhanced data from middleware (if available)
      reference: recallableCase.reference,
      sentenced: recallableCase.isSentenced,
      sentences: recallableCase.sentences || [],
    }
  }
}
