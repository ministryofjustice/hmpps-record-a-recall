import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { AnalysedSentenceAndOffence } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

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
}
