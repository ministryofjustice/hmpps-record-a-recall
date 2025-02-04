import type { CourtCase } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import { ApiCourtCase } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class CourtCaseService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getAllCourtCases(nomsId: string, username: string): Promise<CourtCase[]> {
    const firstPageOfCases = await (await this.getApiClient(username)).getCourtCases(nomsId)

    return firstPageOfCases.content.map((apiCase: ApiCourtCase): CourtCase => this.fromApiCourtCase(apiCase))
  }

  private async getApiClient(username: string): Promise<RemandAndSentencingApiClient> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  fromApiCourtCase(apiCase: ApiCourtCase) {
    return {
      caseId: apiCase.courtCaseUuid,
      status: apiCase.status,
      date: apiCase.latestAppearance?.appearanceDate,
      // TODO decorate this with court name
      location: apiCase.latestAppearance?.courtCode,
      reference: apiCase.latestAppearance?.courtCaseReference,
    }
  }
}
