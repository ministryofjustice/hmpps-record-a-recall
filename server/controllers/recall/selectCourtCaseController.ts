import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'

export default class SelectCourtCaseController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setCourtCaseItems)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    req.form.options.fields.courtCases.items = req.sessionModel.get('CourtCaseOptions')
    const selectedCourtCases = req.sessionModel.get<string[]>('courtCases')
    req.form.options.fields.courtCases.values = selectedCourtCases || []
    return super.locals(req, res)
  }

  async setCourtCaseItems(req: FormWizard.Request, res: Response, next: NextFunction) {
    const sessionCases = req.sessionModel.get('CourtCaseOptions')
    if (!sessionCases) {
      const cases = await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)
      const courtCodes = cases.map((c: CourtCase) => c.location)
      const courtNames = await req.services.courtService.getCourtNames(courtCodes, req.user.username)
      // eslint-disable-next-line no-param-reassign,no-return-assign
      cases.forEach(c => (c.locationName = courtNames.get(c.location)))
      req.sessionModel.set('allCourtCases', cases)
      const items = cases
        .filter((c: CourtCase) => c.status !== 'DRAFT')
        .filter((c: CourtCase) => c.sentenced)
        .map((c: CourtCase) => ({
          text: `Case ${c.reference ?? 'held'} at ${c.locationName || c.location} on ${c.date}`,
          value: c.caseId,
        }))
      req.form.options.fields.courtCases.items = items
      req.sessionModel.set('CourtCaseOptions', items)
    } else {
      // @ts-expect-error this is set correctly the first time the user was on this page
      req.form.options.fields.courtCases.items = sessionCases
    }
    return next()
  }
}
