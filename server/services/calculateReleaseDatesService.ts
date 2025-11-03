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

  async getSledFromLatestCalc(nomsId: string): Promise<string | undefined> {
    const latestCalc = await this.calculateReleaseDatesApiClient.getLatestCalculation(nomsId)
    if (!latestCalc?.dates) return undefined

    // Prefer SLED if available
    const sled = latestCalc.dates.find(it => it.type === 'SLED')?.date
    if (sled) return sled

    // Otherwise fall back to LED
    const led = latestCalc.dates.find(it => it.type === 'LED')?.date
    if (led) return led

    // Nothing found
    return undefined
  }
}
