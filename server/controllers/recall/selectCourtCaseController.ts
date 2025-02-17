import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { SummarisedSentenceGroup } from '../../utils/sentenceUtils'
import {
  getAllCourtCases,
  getCourtCaseOptions,
  getCourtCases,
  sessionModelFields,
} from '../../helpers/formWizardHelper'

export default class SelectCourtCaseController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setCourtCaseItems)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    req.form.options.fields.courtCases.items = getCourtCaseOptions(req)
    const selectedCourtCases = getCourtCases(req)
    req.form.options.fields.courtCases.values = selectedCourtCases || []
    return super.locals(req, res)
  }

  async setCourtCaseItems(req: FormWizard.Request, res: Response, next: NextFunction) {
    const sessionCases = getCourtCaseOptions(req)
    if (!sessionCases) {
      const cases = await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)
      const courtCodes = cases.map((c: CourtCase) => c.location)
      const courtNames = await req.services.courtService.getCourtNames(courtCodes, req.user.username)
      // eslint-disable-next-line no-param-reassign,no-return-assign
      cases.forEach(c => (c.locationName = courtNames.get(c.location)))
      req.sessionModel.set(sessionModelFields.ALL_COURT_CASES, cases)
      const items = cases
        .filter((c: CourtCase) => c.status !== 'DRAFT')
        .filter((c: CourtCase) => c.sentenced)
        .map((c: CourtCase) => ({
          text: `Case ${c.reference ?? 'held'} at ${c.locationName || c.location} on ${c.date}`,
          value: c.caseId,
        }))
      req.form.options.fields.courtCases.items = items
      req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, items)
    } else {
      req.form.options.fields.courtCases.items = sessionCases
    }
    return next()
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const selectedCases = getCourtCases(req)
    const caseDetails = getAllCourtCases(req).filter((detail: CourtCase) => selectedCases.includes(detail.caseId))
    const summarisedSentencesGroups = summariseRasCases(caseDetails)
    res.locals.summarisedSentencesGroups = summarisedSentencesGroups
    req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
    res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(group => group.hasEligibleSentences).length
    const sentenceCount = summarisedSentencesGroups?.flatMap((g: SummarisedSentenceGroup) =>
      g.eligibleSentences.flatMap(s => s.sentenceId),
    ).length
    req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
    res.locals.casesWithEligibleSentences = sentenceCount

    return super.successHandler(req, res, next)
  }
}
