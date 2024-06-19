import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, hmppsAuthClient } = dataAccess()

  const auditService = new AuditService(hmppsAuditClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)

  return {
    applicationInfo,
    auditService,
    prisonerService,
  }
}

export type Services = ReturnType<typeof services>
