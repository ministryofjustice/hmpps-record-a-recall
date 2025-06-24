import type { CourtCase, Sentence } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import { ApiCourtCase, ApiCourtCasePage, ApiCharge } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class CourtCaseService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getAllCourtCases(nomsId: string, username: string): Promise<CourtCase[]> {
    return (await this.getCases(nomsId, username)).map(
      (apiCase: ApiCourtCase): CourtCase => this.fromApiCourtCase(apiCase),
    )
  }

  async getAllRecallableCourtCases(nomsId: string, username: string) {
    console.log('**')
    return (await this.getApiClient(username)).getRecallableCourtCases(nomsId)
  }

  private async getCases(
    nomisId: string,
    username: string,
    page = 0,
    result: ApiCourtCase[] = [],
  ): Promise<ApiCourtCase[]> {
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

  fromApiCourtCase(apiCase: ApiCourtCase): CourtCase {
    return {
      caseId: apiCase.courtCaseUuid,
      status: apiCase.status,
      date: apiCase.latestAppearance?.appearanceDate,
      location: apiCase.latestAppearance?.courtCode,
      reference: apiCase.latestAppearance?.courtCaseReference,
      sentenced: apiCase.latestAppearance?.warrantType === 'SENTENCING' || false,
      sentences: apiCase.latestAppearance?.charges,
    }
  }

  sentenceFromApiCharge(apiCharge: ApiCharge, apiCase: ApiCourtCase): Sentence {
    const apiSentence = apiCharge.sentence

    return {
      sentenceUuid: apiSentence?.sentenceUuid,
      chargeNumber: apiSentence?.chargeNumber,
      custodialTerm: apiSentence?.periodLengths.find(pl => pl.periodLengthType === 'CUSTODIAL_TERM'),
      licenceTerm: apiSentence?.periodLengths.find(pl => pl.periodLengthType === 'LICENCE_PERIOD'),
      sentenceServeType: apiSentence?.sentenceServeType,
      sentenceType: apiSentence?.sentenceType.description,
      convictionDate: apiSentence?.convictionDate,
      offenceDate: `${apiCharge.offenceStartDate}${apiCharge.offenceEndDate ? ` to ${apiCharge.offenceEndDate}` : ''}`,
      offenceCode: apiCharge.offenceCode,
      // TODO decorate with proper description
      offenceDescription: apiCharge.offenceCode,
      courtDescription: apiCase.latestAppearance.courtCode,
    }
  }
}
