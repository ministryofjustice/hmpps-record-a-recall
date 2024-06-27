import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'
import RecallService from './recallService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, hmppsAuthClient } = dataAccess()

  const auditService = new AuditService(hmppsAuditClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)
  const recallService = new RecallService(hmppsAuthClient)

  return {
    applicationInfo,
    auditService,
    prisonerService,
    recallService,
  }
}

export type Services = ReturnType<typeof services>
