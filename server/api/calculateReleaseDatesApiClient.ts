import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  AnalysedSentenceAndOffence,
  CalculationBreakdown,
  LatestCalculation,
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

  async getActiveAnalyzedSentencesAndOffences(bookingId: number): Promise<AnalysedSentenceAndOffence[]> {
    return this.restClient.get({
      path: `/sentence-and-offence-information/${bookingId}`,
    }) as Promise<AnalysedSentenceAndOffence[]>
  }

  async getLatestCalculation(nomsId: string): Promise<LatestCalculation> {
    return this.restClient.get({ path: `/calculation/${nomsId}/latest` }) as Promise<LatestCalculation>
  }

  async getCalculationBreakdown(calculationRequestId: number): Promise<CalculationBreakdown> {
    return this.restClient.get({
      path: `/calculation/breakdown/${calculationRequestId}`,
    }) as Promise<CalculationBreakdown>
  }
}
