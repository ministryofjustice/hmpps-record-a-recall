import {
  LicenceDates,
  RecordARecallDecisionResult,
  RecordARecallRequest,
  RecordARecallValidationResult,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'
import logger from '../../logger'

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
    const decision = await this.calculateReleaseDatesApiClient.makeDecisionForRecordARecall(
      nomsId,
      recordARecallRequest,
      username,
    )

    // Log validation messages returned from CRDS, could relax this logging after the service becomes more stable
    logger.info(
      `CRDS decision: ${decision.decision}, nomsId: ${nomsId}, ${decision.validationMessages.length} messages`,
    )
    decision.validationMessages.forEach(v => {
      logger.info(`CRDS validation: ${v.code} for ${nomsId}: ${v.message}`)
    })

    return decision
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
