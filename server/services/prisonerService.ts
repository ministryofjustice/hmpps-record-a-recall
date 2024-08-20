import { Readable } from 'stream'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonApiClient from '../api/prisonApiClient'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import {
  CalculationBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
  AnalysedSentenceAndOffence,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../logger'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, username: string): Promise<PrisonerSearchApiPrisoner> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username)).getPrisonerDetails(nomsId)
  }

  async getPrisonerImage(nomsId: string, username: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(nomsId)
  }

  async getCalculationBreakdown(nomsId: string, username: string): Promise<CalculationBreakdown | undefined> {
    try {
      const crdApi = await this.getCRDApiClient(username)
      const latestCalculation = await crdApi.getLatestCalculation(nomsId)
      return await crdApi.getCalculationBreakdown(latestCalculation.calculationRequestId)
    } catch (error) {
      logger.error(`Error in getCalculationBreakdown: ${error.message}`, error)
      return undefined
    }
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
