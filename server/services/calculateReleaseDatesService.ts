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

  async getLedFromLatestCalc(nomsId: string): Promise<string | undefined> {
    let latestCalc

    try {
      latestCalc = await this.calculateReleaseDatesApiClient.getLatestCalculation(nomsId)
    } catch (error) {
      if (error?.responseStatus === 404) {
        return undefined
      }
      throw error
    }

    if (!latestCalc?.dates) return undefined

    const sled = latestCalc.dates.find(it => it.type === 'SLED')?.date
    if (sled) return sled

    const led = latestCalc.dates.find(it => it.type === 'LED')?.date
    if (led) return led

    return undefined
  }
}
