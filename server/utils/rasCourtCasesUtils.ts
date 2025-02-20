import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { getCourtCaseOptions } from '../helpers/formWizardHelper'

export default async function getCourtCaseOptionsFromRas(req: FormWizard.Request, res: Response) {
  const sessionCases = getCourtCaseOptions(req)
  if (!sessionCases) {
    const cases = await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)
    const courtCodes = cases.map((c: CourtCase) => c.location)
    const courtNames = await req.services.courtService.getCourtNames(courtCodes, req.user.username)
    // eslint-disable-next-line no-param-reassign,no-return-assign
    cases.forEach(c => (c.locationName = courtNames.get(c.location)))

    return cases.filter((c: CourtCase) => c.status !== 'DRAFT').filter((c: CourtCase) => c.sentenced)
  }
  return sessionCases
}
