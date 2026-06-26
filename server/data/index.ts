import { AuthenticationClient, InMemoryTokenStore, RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import { createRedisClient } from './redisClient'
import config from '../config'
import HmppsAuditClient from './hmppsAuditClient'
import logger from '../../logger'
import AdjustmentsApiClient from './adjustmentsApiClient'
import CalculateReleaseDatesApiClient from './calculateReleaseDatesApiClient'
import CourtCasesReleaseDatesApiClient from './courtCasesReleaseDatesApiClient'
import ManageOffencesApiClient from './manageOffencesApiClient'
import PrisonApiClient from './prisonApiClient'
import PrisonerSearchApiClient from './prisonerSearchApiClient'
import RemandAndSentencingApiClient from './remandAndSentencingApiClient'
import FeComponentsClient from './feComponentsClient'
import PrisonRegisterApiClient from './prisonRegisterApiClient'
import CourtRegisterApiClient from './courtRegisterApiClient'
import applicationInfoSupplier from '../applicationInfo'

const applicationInfo = applicationInfoSupplier()

export const dataAccess = () => {
  const hmppsAuthClient = new AuthenticationClient(
    config.apis.hmppsAuth,
    logger,
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  )

  return {
    applicationInfo,
    hmppsAuthClient,
    hmppsAuditClient: new HmppsAuditClient(config.sqs.audit),
    adjustmentsApiClient: new AdjustmentsApiClient(hmppsAuthClient),
    calculateReleaseDatesApiClient: new CalculateReleaseDatesApiClient(hmppsAuthClient),
    courtCasesReleaseDatesApiClient: new CourtCasesReleaseDatesApiClient(hmppsAuthClient),
    manageOffencesApiClient: new ManageOffencesApiClient(hmppsAuthClient),
    prisonApiClient: new PrisonApiClient(hmppsAuthClient),
    prisonerSearchApiClient: new PrisonerSearchApiClient(hmppsAuthClient),
    remandAndSentencingApiClient: new RemandAndSentencingApiClient(hmppsAuthClient),
    prisonRegisterApiClient: new PrisonRegisterApiClient(hmppsAuthClient),
    feComponentsClient: new FeComponentsClient(hmppsAuthClient),
    courtRegisterApiClient: new CourtRegisterApiClient(hmppsAuthClient),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export { AuthenticationClient, HmppsAuditClient }
