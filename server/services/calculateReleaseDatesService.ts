import {
  LicenceDates,
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

  async getLicenceDatesFromLatestCalc(nomsId: string): Promise<LicenceDates | undefined> {
    let latestCalc

    try {
      latestCalc = await this.calculateReleaseDatesApiClient.getLatestCalculation(nomsId)
    } catch (error) {
      if (error?.responseStatus === 404) return undefined
      throw error
    }

    if (!latestCalc?.dates) return undefined

    const sled = latestCalc.dates.find(it => it.type === 'SLED')?.date
    const sed = latestCalc.dates.find(it => it.type === 'SED')?.date
    const led = latestCalc.dates.find(it => it.type === 'LED')?.date

    if (!sled && !sed && !led) return undefined

    if (sled) {
      return { sledExists: true, sled }
    }

    return {
      led,
      sed,
      sledExists: false,
    }
  }
}
