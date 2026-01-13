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

    // calculate areDifferent only if no sled
    let areDifferent = false
    if (!sled) {
      if (sed && led) {
        // convert to Date objects to compare
        const sedDate = new Date(sed).getTime()
        const ledDate = new Date(led).getTime()
        areDifferent = sedDate !== ledDate
      }
    }

    // @ts-ignore
    console.log('***************SERVICE*************', 'sled', sled, 'sed', sed, 'led', led, 'areDiff', areDifferent)

    return {
      sled,
      sed,
      led,
      areDifferent,
    }
  }
}
