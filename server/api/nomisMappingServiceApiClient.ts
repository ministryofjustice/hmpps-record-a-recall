import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { NomisDpsSentenceMapping, NomisSentenceId, NomisDpsInfo } from '../@types/nomisMappingApi/nomisMappingApiTypes'

export default class NomisMappingServiceApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Nomis Mapping API', config.apis.nomisMappingServiceApi as ApiConfig, token)
  }

  async postNomisToDpsMappingLookup(mappings: NomisSentenceId[]): Promise<NomisDpsSentenceMapping[]> {
    console.log('nomisMappingServiceApiClient, postNomisToDpsMappingLookup')
    return this.restClient.post({
      path: `/api/sentences/nomis`,
      data: mappings,
    }) as Promise<NomisDpsSentenceMapping[]>
  }

  // both the below get the sentenceMapping

  // based on getting dpsSentenceId from above
  async getDpsSentencesFromNomisMappings(mappings: NomisSentenceId[]): Promise<NomisDpsInfo[]> {
    const sentenceMappings = await this.postNomisToDpsMappingLookup(mappings)
  
    const requests = sentenceMappings.map(({ dpsSentenceId }) =>
      this.restClient.get({
        path: `/mapping/court-sentencing/sentences/dps-sentence-id/${dpsSentenceId}`, 
      }) as Promise<NomisDpsInfo>
    )
    return Promise.all(requests)
  }
  
// can get same info without using the post above
  async getNomisToDpsMappingLookup(mappings: NomisSentenceId[]): Promise<NomisDpsInfo[]> {
    const requests = mappings.map(({nomisBookingId, nomisSentenceSequence}) => 
      this.restClient.get({
        path: `/mapping/court-sentencings/sentences/nomis-booking-id/${nomisBookingId}/nomis-sentence-sequence/${nomisSentenceSequence}`
      }) as Promise<NomisDpsInfo>
    )
    return Promise.all(requests)
  }
}

// but do we need the term suquence??? apparantly its the same as the nomisSentenceId thats passed in in the GET
