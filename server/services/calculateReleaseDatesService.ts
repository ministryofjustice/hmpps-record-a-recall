import {
  RecordARecallDecisionResult,
  RecordARecallRequest,
  RecordARecallValidationResult,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'

export default class CalculateReleaseDatesService {
  constructor(private readonly calculateReleaseDatesApiClient: CalculateReleaseDatesApiClient) {}

  async validateForRecordARecall(nomsId: string, username: string): Promise<RecordARecallValidationResult> {
    return this.calculateReleaseDatesApiClient.validateForRecordARecall(nomsId, username)
  }

  async makeDecisionForRecordARecall(
    nomsId: string,
    recordARecallRequest: RecordARecallRequest,
    username: string,
  ): Promise<RecordARecallDecisionResult> {
    return this.calculateReleaseDatesApiClient.makeDecisionForRecordARecall(nomsId, recordARecallRequest, username)
  }
}
