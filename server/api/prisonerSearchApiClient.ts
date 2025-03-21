import { PagedCollectionOfPrisoners, PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'

export default class PrisonerSearchApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Prisoner Search API', config.apis.prisonerSearchApi as ApiConfig, token)
  }

  async getPrisonerDetails(nomsId: string): Promise<PrisonerSearchApiPrisoner> {
    return this.restClient.get({ path: `/prisoner/${nomsId}` }) as Promise<PrisonerSearchApiPrisoner>
  }

  async getPrisonInmates(prisonId: string): Promise<PagedCollectionOfPrisoners> {
    return this.restClient.get({
      path: `/prison/${prisonId}/prisoners?size=1000`,
    }) as Promise<PagedCollectionOfPrisoners>
  }
}
