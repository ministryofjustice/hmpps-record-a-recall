import { HmppsAuthClient } from '../data'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import {
  CalculationBreakdown,
  LatestCalculation,
  RecordARecallCalculationResult,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../logger'

export default class CalculationService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  private async getCRDApiClient(username: string) {
    return new CalculateReleaseDatesApiClient(await this.getSystemClientToken(username))
  }

  async getSentencesAndReleaseDates(
    calculationRequestId: number,
    username: string,
  ): Promise<SentenceAndOffenceWithReleaseArrangements[]> {
    const crdApi = await this.getCRDApiClient(username)
    return crdApi.getSentencesAndReleaseDates(calculationRequestId)
  }

  async getLatestCalculation(nomsId: string, username: string): Promise<LatestCalculation> {
    const crdApi = await this.getCRDApiClient(username)
    return crdApi.getLatestCalculation(nomsId)
  }

  async getTemporaryCalculation(nomsId: string, username: string): Promise<RecordARecallCalculationResult> {
    const crdApi = await this.getCRDApiClient(username)
    return crdApi.calculateReleaseDates(nomsId)
  }

  async calculateTemporaryDates(nomisId: string, username: string) {
    const crdApi = await this.getCRDApiClient(username)
    try {
      logger.info('Requesting new temporary calculation from CRDS')
      return await crdApi.calculateReleaseDates(nomisId)
    } catch (error) {
      logger.error(`CRDS erorred when requesting a temporary calculation: ${error.message}`)
      throw error
    }
  }

  async getCalculationBreakdown(
    calculationRequestId: number,
    username: string,
  ): Promise<CalculationBreakdown | undefined> {
    if (!calculationRequestId) {
      logger.error(`Error in getCalculationBreakdown: No calculation Request id`)
      throw new Error('No calculationRequestId provided for breakdown')
    }
    try {
      const crdApi = await this.getCRDApiClient(username)
      return await crdApi.getCalculationBreakdown(calculationRequestId)
    } catch (error) {
      logger.error(`Error in getCalculationBreakdown: ${error.message}`, error)
      throw error
    }
  }
}
