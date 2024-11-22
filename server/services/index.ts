import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'
import RecallService from './recallService'
import FeComponentsService from './feComponentsService'
import BulkCalculationService from './bulkCalculationService'
import CalculationService from './calculationService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, hmppsAuthClient, feComponentsClient } = dataAccess()

  const auditService = new AuditService(hmppsAuditClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)
  const recallService = new RecallService(hmppsAuthClient)
  const calculationService = new CalculationService(hmppsAuthClient)
  const feComponentsService = new FeComponentsService(feComponentsClient)
  const bulkCalculationService = new BulkCalculationService(calculationService)

  return {
    applicationInfo,
    auditService,
    prisonerService,
    recallService,
    calculationService,
    feComponentsService,
    bulkCalculationService,
  }
}

export type Services = ReturnType<typeof services>
