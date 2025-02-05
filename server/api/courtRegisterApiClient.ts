import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'

export default class CourtRegisterApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Court Register  API', config.apis.courtRegisterApi as ApiConfig, token)
  }

  async getCourtDetails(courtIds: string): Promise<Court[]> {
    return this.restClient.get({
      path: `/courts/id/multiple`,
      query: { courtIds },
    }) as Promise<Court[]>
  }
}
