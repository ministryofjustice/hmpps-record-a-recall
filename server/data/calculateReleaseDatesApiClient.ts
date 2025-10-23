import config from '../config'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import {
  CalculationBreakdown,
  LatestCalculation,
  RecordARecallCalculationResult,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../logger'
import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'

export default class CalculateReleaseDatesApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Calculate Release Dates API', config.apis.calculateReleaseDatesApi, logger, authenticationClient)
  }

  async getLatestCalculation(nomsId: string): Promise<LatestCalculation> {
    return this.get({ path: `/calculation/${nomsId}/latest` }, asSystem()) as Promise<LatestCalculation>
  }

  async getCalculationBreakdown(calculationRequestId: number): Promise<CalculationBreakdown> {
    return this.get(
      {
        path: `/calculation/breakdown/${calculationRequestId}`,
      },
      asSystem(),
    ) as Promise<CalculationBreakdown>
  }

  async getSentencesAndReleaseDates(
    calculationRequestId: number,
  ): Promise<SentenceAndOffenceWithReleaseArrangements[]> {
    return this.get(
      {
        path: `/calculation/sentence-and-offences/${calculationRequestId}`,
      },
      asSystem(),
    ) as Promise<SentenceAndOffenceWithReleaseArrangements[]>
  }

  async calculateReleaseDates(nomsId: string): Promise<RecordARecallCalculationResult> {
    return this.post({ path: `/record-a-recall/${nomsId}` }, asSystem()) as Promise<RecordARecallCalculationResult>
  }
}
