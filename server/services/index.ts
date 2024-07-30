import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'
import RecallService from './recallService'
import ValidationService from './validationService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, hmppsAuthClient } = dataAccess()

  const auditService = new AuditService(hmppsAuditClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)
  const recallService = new RecallService(hmppsAuthClient)
  const validationService = new ValidationService()

  return {
    applicationInfo,
    auditService,
    prisonerService,
    recallService,
    validationService,
  }
}

export type Services = ReturnType<typeof services>
