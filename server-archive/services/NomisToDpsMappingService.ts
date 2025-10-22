import { HmppsAuthClient } from '../data'
import NomisMappingServiceApiClient from '../api/nomisMappingServiceApiClient'
import { NomisDpsSentenceMapping, NomisSentenceId } from '../@types/nomisMappingApi/nomisMappingApiTypes'

export default class NomisToDpsMappingService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async getApiClient(username: string): Promise<NomisMappingServiceApiClient> {
    return new NomisMappingServiceApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async getNomisToDpsMappingLookup(mappings: NomisSentenceId[], username: string): Promise<NomisDpsSentenceMapping[]> {
    return (await this.getApiClient(username)).postNomisToDpsMappingLookup(mappings)
  }
}
