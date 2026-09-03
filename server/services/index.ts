import { AuditServiceFactory } from '@ministryofjustice/hmpps-audit-client'
import { dataAccess } from '../data'
import AuditService from './auditService'
import logger from '../../logger'
import config from '../config'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import FeComponentsService from './feComponentsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import UserService from './userService'
import CourtCasesReleaseDatesService from './courtCasesReleaseDatesService'
import RecallService from './recallService'
import AdjustmentsService from './adjustmentsService'

export const services = () => {
  const {
    applicationInfo,
    prisonerSearchApiClient,
    prisonApiClient,
    feComponentsClient,
    calculateReleaseDatesApiClient,
    courtCasesReleaseDatesApiClient,
    remandAndSentencingApiClient,
    prisonRegisterApiClient,
    manageOffencesApiClient,
    courtRegisterApiClient,
    adjustmentsApiClient,
  } = dataAccess()

  const prisonerService = new PrisonerService(prisonApiClient)
  return {
    applicationInfo,
    auditService: new AuditService(AuditServiceFactory.createInstance(config.sqs.audit, logger)),
    prisonerSearchService: new PrisonerSearchService(prisonerSearchApiClient),
    prisonerService,
    userService: new UserService(prisonerService),
    feComponentsService: new FeComponentsService(feComponentsClient),
    calculateReleaseDatesService: new CalculateReleaseDatesService(calculateReleaseDatesApiClient),
    courtCasesReleaseDatesService: new CourtCasesReleaseDatesService(courtCasesReleaseDatesApiClient),
    recallService: new RecallService(
      remandAndSentencingApiClient,
      manageOffencesApiClient,
      prisonRegisterApiClient,
      courtRegisterApiClient,
    ),
    adjustmentsService: new AdjustmentsService(adjustmentsApiClient),
  }
}

export type Services = ReturnType<typeof services>
