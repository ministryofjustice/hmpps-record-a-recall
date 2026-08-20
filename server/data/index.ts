import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
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
import ClientCredentialsTokenStore from './clientCredentialsTokenStore'
import ClientCredentialsRedisTokenStore from './clientCredentialsRedisTokenStore'
import ClientCredentialsInMemoryTokenStore from './clientCredentialsInMemoryTokenStore'

const applicationInfo = applicationInfoSupplier()

export const dataAccess = () => {
  const clientCredentialsTokenStore: ClientCredentialsTokenStore = config.redis.enabled
    ? new ClientCredentialsRedisTokenStore(createRedisClient())
    : new ClientCredentialsInMemoryTokenStore()
  const hmppsAuthClient = new AuthenticationClient(config.apis.hmppsAuth, logger, clientCredentialsTokenStore)

  return {
    applicationInfo,
    hmppsAuthClient,
    hmppsAuditClient: new HmppsAuditClient(config.sqs.audit),
    adjustmentsApiClient: new AdjustmentsApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    calculateReleaseDatesApiClient: new CalculateReleaseDatesApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    courtCasesReleaseDatesApiClient: new CourtCasesReleaseDatesApiClient(hmppsAuthClient),
    manageOffencesApiClient: new ManageOffencesApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    prisonApiClient: new PrisonApiClient(hmppsAuthClient),
    prisonerSearchApiClient: new PrisonerSearchApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    remandAndSentencingApiClient: new RemandAndSentencingApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    prisonRegisterApiClient: new PrisonRegisterApiClient(hmppsAuthClient, clientCredentialsTokenStore),
    feComponentsClient: new FeComponentsClient(hmppsAuthClient),
    courtRegisterApiClient: new CourtRegisterApiClient(hmppsAuthClient, clientCredentialsTokenStore),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export { AuthenticationClient, HmppsAuditClient }
