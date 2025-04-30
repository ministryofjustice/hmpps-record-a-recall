import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { CreateResponse } from '../@types/nomisMappingApi/nomisMappingApiTypes'

export default class NomisMappingServiceApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Nomis Mapping API', config.apis.nomisMappingServiceApi as ApiConfig, token)
  }

  async postNomisMapping(firstBooking: number, sentenceSequence: number): Promise<CreateResponse> {
    return this.restClient.post({
      path: `/sentences/nomis`,
      data: {
        nomisBookingId: firstBooking,
        nomisSentenceSequence: sentenceSequence,
      },
    }) as Promise<CreateResponse>
  }
}
