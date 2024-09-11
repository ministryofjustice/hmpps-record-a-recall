import { Readable } from 'stream'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonApiClient from '../api/prisonApiClient'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import { SentenceAndOffenceWithReleaseArrangements } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, username: string): Promise<PrisonerSearchApiPrisoner> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username)).getPrisonerDetails(nomsId)
  }

  async getPrisonerImage(nomsId: string, username: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(nomsId)
  }

  async getSentencesAndReleaseDates(
    nomsId: string,
    username: string,
  ): Promise<SentenceAndOffenceWithReleaseArrangements[]> {
    const crdApi = await this.getCRDApiClient(username)
    const latestCalculation = await crdApi.getLatestCalculation(nomsId)
    return crdApi.getSentencesAndReleaseDates(latestCalculation.calculationRequestId)
  }

  private async getCRDApiClient(username: string) {
    return new CalculateReleaseDatesApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
