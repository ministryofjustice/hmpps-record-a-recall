import type { CourtCase } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import { ApiCourtCase, ApiCourtCasePage } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class CourtCaseService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getAllCourtCases(nomsId: string, username: string): Promise<CourtCase[]> {
    return (await this.getCases(nomsId, username)).map(
      (apiCase: ApiCourtCase): CourtCase => this.fromApiCourtCase(apiCase),
    )
  }

  async getCases(nomisId: string, username: string, page = 0, result: ApiCourtCase[] = []): Promise<ApiCourtCase[]> {
    const courtCasePage = await this.getPage(nomisId, page, username)
    return courtCasePage.last
      ? result.concat(courtCasePage.content)
      : this.getCases(nomisId, username, page + 1, result.concat(courtCasePage.content))
  }

  private async getPage(nomisId: string, page: number, username: string): Promise<ApiCourtCasePage> {
    return (await this.getApiClient(username)).getCourtCases(nomisId, page)
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
