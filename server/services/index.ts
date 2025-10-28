import { dataAccess } from '../data'
import AuditService from './auditService'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import FeComponentsService from './feComponentsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import UserService from './userService'
import CourtCasesReleaseDatesService from './courtCasesReleaseDatesService'
import RecallService from './recallService'

export const services = () => {
  const {
    applicationInfo,
    hmppsAuditClient,
    prisonerSearchApiClient,
    prisonApiClient,
    feComponentsClient,
    calculateReleaseDatesApiClient,
    courtCasesReleaseDatesApiClient,
    remandAndSentencingApiClient,
    manageOffencesApiClient,
  } = dataAccess()

  const prisonerService = new PrisonerService(prisonApiClient)
  return {
    applicationInfo,
    auditService: new AuditService(hmppsAuditClient),
    prisonerSearchService: new PrisonerSearchService(prisonerSearchApiClient),
    prisonerService,
    userService: new UserService(prisonerService),
    feComponentsService: new FeComponentsService(feComponentsClient),
    calculateReleaseDatesService: new CalculateReleaseDatesService(calculateReleaseDatesApiClient),
    courtCasesReleaseDatesService: new CourtCasesReleaseDatesService(courtCasesReleaseDatesApiClient),
    recallService: new RecallService(remandAndSentencingApiClient),
  }
}

export type Services = ReturnType<typeof services>
