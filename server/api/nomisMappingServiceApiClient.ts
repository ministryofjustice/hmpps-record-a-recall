import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../@types/nomisMappingApi/nomisMappingApiTypes'

export default class NomisMappingServiceApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Nomis Mapping API', config.apis.nomisMappingServiceApi as ApiConfig, token)
  }

  async postNomisMappings(mappings: NomisSentenceId[]): Promise<NomisDpsSentenceMapping[]> {
    return this.restClient.post({
      path: `/sentences/nomis`,
      data: mappings,
    }) as Promise<NomisDpsSentenceMapping[]>
  }
}
