import { RecordARecallValidationResult } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'

export default class CalculateReleaseDatesService {
  constructor(private readonly calculateReleaseDatesApiClient: CalculateReleaseDatesApiClient) {}

  async validateForRecordARecall(nomsId: string, username: string): Promise<RecordARecallValidationResult> {
    return this.calculateReleaseDatesApiClient.validateForRecordARecall(nomsId, username)
  }
}
