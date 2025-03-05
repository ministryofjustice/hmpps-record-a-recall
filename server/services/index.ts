import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'
import RecallService from './recallService'
import FeComponentsService from './feComponentsService'
import BulkCalculationService from './bulkCalculationService'
import CalculationService from './calculationService'
import CourtCasesReleaseDatesService from './courtCasesReleaseDatesService'
import CourtCaseService from './CourtCaseService'
import CourtService from './CourtService'
import AdjustmentsService from './adjustmentsService'
import ManageUsersService from './manageUsersService'

export const services = () => {
  const { applicationInfo, hmppsAuditClient, hmppsAuthClient, feComponentsClient, manageUsersApiClient } = dataAccess()

  const auditService = new AuditService(hmppsAuditClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)
  const recallService = new RecallService(hmppsAuthClient)
  const calculationService = new CalculationService(hmppsAuthClient)
  const feComponentsService = new FeComponentsService(feComponentsClient)
  const bulkCalculationService = new BulkCalculationService(calculationService)
  const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService()
  const courtCaseService = new CourtCaseService(hmppsAuthClient)
  const courtService = new CourtService(hmppsAuthClient)
  const adjustmentsService = new AdjustmentsService(hmppsAuthClient)
  const manageUsersService = new ManageUsersService(manageUsersApiClient)

  return {
    applicationInfo,
    auditService,
    prisonerService,
    recallService,
    calculationService,
    feComponentsService,
    bulkCalculationService,
    courtCasesReleaseDatesService,
    courtCaseService,
    courtService,
    adjustmentsService,
    manageUsersService,
  }
}

export type Services = ReturnType<typeof services>
