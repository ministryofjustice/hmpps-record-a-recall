/* eslint-disable import/first */
/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import { AuthenticationClient, InMemoryTokenStore, RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import { initialiseAppInsights, buildAppInsightsClient } from '../utils/azureAppInsights'
import applicationInfoSupplier from '../applicationInfo'

const applicationInfo = applicationInfoSupplier()
initialiseAppInsights()
buildAppInsightsClient(applicationInfo)

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
    feComponentsClient: new FeComponentsClient(hmppsAuthClient),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export { AuthenticationClient, HmppsAuditClient }
