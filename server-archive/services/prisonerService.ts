import { Readable } from 'stream'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonApiClient from '../api/prisonApiClient'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, username: string): Promise<PrisonerSearchApiPrisoner> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username)).getPrisonerDetails(nomsId)
  }

  async getPrisonersInEstablishment(prisonId: string, username: string): Promise<PrisonerSearchApiPrisoner[]> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username))
      .getPrisonInmates(prisonId)
      .then(inmates => {
        return inmates.content.filter(inmate => inmate.legalStatus === 'SENTENCED')
      })
  }

  async getPrisonerImage(nomsId: string, username: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(nomsId)
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
