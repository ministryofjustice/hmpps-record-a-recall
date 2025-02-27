import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { SummarisedSentenceGroup } from '../../utils/sentenceUtils'
import { getCourtCaseOptions, getCourtCases, sessionModelFields } from '../../helpers/formWizardHelper'
import getCourtCaseOptionsFromRas from '../../utils/rasCourtCasesUtils'

export default class SelectCourtCaseController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setCourtCaseItems)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    req.form.options.fields.courtCases.items = this.toCheckboxItems(getCourtCaseOptions(req))
    const selectedCourtCases = getCourtCases(req)
    req.form.options.fields.courtCases.values = selectedCourtCases || []
    return super.locals(req, res)
  }

  async setCourtCaseItems(req: FormWizard.Request, res: Response, next: NextFunction) {
    const caseOptions = await getCourtCaseOptionsFromRas(req, res)
    req.form.options.fields.courtCases.items = this.toCheckboxItems(caseOptions)
    req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, caseOptions)

    return next()
  }

  toCheckboxItems(courtCases: CourtCase[]) {
    return courtCases.map((c: CourtCase) => ({
      text: `Case ${c.reference ?? 'held'} at ${c.locationName || c.location} on ${c.date}`,
      value: c.caseId,
    }))
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const selectedCases = getCourtCases(req)
    const caseDetails = getCourtCaseOptions(req).filter((detail: CourtCase) => selectedCases.includes(detail.caseId))
    const summarisedSentencesGroups = summariseRasCases(caseDetails)
    res.locals.summarisedSentencesGroups = summarisedSentencesGroups
    req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
    res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(group => group.hasEligibleSentences).length
    const sentenceCount = summarisedSentencesGroups?.flatMap((g: SummarisedSentenceGroup) =>
      g.eligibleSentences.flatMap(s => s.sentenceId),
    ).length
    req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
    res.locals.casesWithEligibleSentences = sentenceCount
    req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

    return super.successHandler(req, res, next)
  }
}
