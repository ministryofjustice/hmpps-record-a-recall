import { dataAccess } from '../data'
import AuditService from './auditService'
import FeComponentsService from './feComponentsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import UserService from './userService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, prisonerSearchApiClient, prisonApiClient, feComponentsClient } =
    dataAccess()

  const prisonerService = new PrisonerService(prisonApiClient)
  return {
    applicationInfo,
    auditService: new AuditService(hmppsAuditClient),
    prisonerSearchService: new PrisonerSearchService(prisonerSearchApiClient),
    prisonerService,
    userService: new UserService(prisonerService),
    feComponentsService: new FeComponentsService(feComponentsClient),
  }
}

export type Services = ReturnType<typeof services>
