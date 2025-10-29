import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import {
  CalculationBreakdown,
  LatestCalculation,
  RecordARecallDecisionResult,
  RecordARecallRequest,
  RecordARecallValidationResult,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class CalculateReleaseDatesApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Calculate Release Dates API', config.apis.calculateReleaseDatesApi, logger, authenticationClient)
  }

  async validateForRecordARecall(prisonerNumber: string, username: string): Promise<RecordARecallValidationResult> {
    return this.get(
      {
        path: `/record-a-recall/${prisonerNumber}/validate`,
      },
      asSystem(username),
    ) as Promise<RecordARecallValidationResult>
  }

  async makeDecisionForRecordARecall(
    prisonerNumber: string,
    recordARecallRequest: RecordARecallRequest,
    username: string,
  ): Promise<RecordARecallDecisionResult> {
    return this.post(
      {
        path: `/record-a-recall/${prisonerNumber}/decision`,
        data: recordARecallRequest,
      },
      asSystem(username),
    ) as Promise<RecordARecallDecisionResult>
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
}
