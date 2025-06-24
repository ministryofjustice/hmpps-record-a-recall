import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import {
  RecallableCourtCase,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RecallableCourtCasesApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Prison API', config.apis.prisonApi as ApiConfig, token)
  }

  async getRecallableCourtCases(prisonerId: string): Promise<RecallableCourtCase[]> {
    return this.restClient.get({
    path: `/court-case/${prisonerId}/recallable-court-cases`,
    }) as Promise<RecallableCourtCase[]>
  }
}