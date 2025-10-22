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
    nomsId?: string,
  ): Promise<CalculationBreakdown | undefined> {
    if (!calculationRequestId) {
      logger.error(`Error in getCalculationBreakdown: No calculation Request id`)
      throw new Error('No calculationRequestId provided for breakdown')
    }

    const crdApi = await this.getCRDApiClient(username)

    try {
      return await crdApi.getCalculationBreakdown(calculationRequestId)
    } catch (error) {
      // Check if this is a stale calculation error (422) ideally API would be using error codes we could check against
      if (error.status === 422 && error.data?.userMessage?.includes('no longer agrees')) {
        if (nomsId) {
          logger.warn(`Calculation ${calculationRequestId} is stale for ${nomsId}`)
        } else {
          logger.warn(`Calculation ${calculationRequestId} is stale (no nomsId provided)`)
        }
        logger.warn(`Stale calculation error details: ${JSON.stringify(error.data)}`)

        // The controller already has logic to handle missing breakdowns
        logger.info(`Returning undefined breakdown for stale calculation ${calculationRequestId}`)
        return undefined
      }

      logger.error(`Error in getCalculationBreakdown: ${error.message}`, error)
      throw error
    }
  }
}
