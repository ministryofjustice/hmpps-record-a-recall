import { Readable } from 'stream'
import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonApiClient from '../data/prisonApiClient'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'
import { AnalysedSentenceAndOffence } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, username: string): Promise<PrisonerSearchApiPrisoner> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username)).getPrisonerDetails(nomsId)
  }

  async getPrisonerImage(nomsId: string, username: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(nomsId)
  }

  async getActiveAnalyzedSentencesAndOffences(
    bookingId: number,
    username: string,
  ): Promise<AnalysedSentenceAndOffence[]> {
    const crdApi = await this.getCRDApiClient(username)
    const sentences = await crdApi.getActiveAnalyzedSentencesAndOffences(bookingId)

    return sentences.filter((s: AnalysedSentenceAndOffence) => s.sentenceStatus === 'A')
  }

  private async getCRDApiClient(username: string) {
    return new CalculateReleaseDatesApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
