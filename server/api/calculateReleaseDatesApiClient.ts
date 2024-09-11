import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
  LatestCalculation,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class CalculateReleaseDatesApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient(
      'Calculate Release Dates API',
      config.apis.calculateReleaseDatesApi as ApiConfig,
      token,
    )
  }

  async getLatestCalculation(nomsId: string): Promise<LatestCalculation> {
    return this.restClient.get({ path: `/calculation/${nomsId}/latest` }) as Promise<LatestCalculation>
  }

  async getCalculationBreakdown(calculationRequestId: number): Promise<CalculationBreakdown> {
    return this.restClient.get({
      path: `/calculation/breakdown/${calculationRequestId}`,
    }) as Promise<CalculationBreakdown>
  }

  async getSentencesAndReleaseDates(
    calculationRequestId: number,
  ): Promise<SentenceAndOffenceWithReleaseArrangements[]> {
    return this.restClient.get({
      path: `/calculation/sentence-and-offences/${calculationRequestId}`,
    }) as Promise<SentenceAndOffenceWithReleaseArrangements[]>
  }

  async calculateReleaseDates(nomsId: string): Promise<CalculatedReleaseDates> {
    return this.restClient.post({ path: `/calculation/record-a-recall/${nomsId}` }) as Promise<CalculatedReleaseDates>
  }
}
