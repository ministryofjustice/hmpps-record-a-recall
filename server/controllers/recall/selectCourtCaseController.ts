import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase, Sentence, Term } from 'models'
import { formatTerm, formatSentenceServeType } from '../../utils/formattingUtils'
import RecallBaseController from './recallBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import getCourtCaseOptionsFromRas from '../../utils/rasCourtCasesUtils'

export default class SelectCourtCaseController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  private sortCourtCasesByMostRecentConviction(cases: CourtCase[]): CourtCase[] {
    return cases.sort((a, b) => {
      const getMostRecentConvictionDate = (courtCase: CourtCase): Date | null => {
        if (!courtCase.sentences || courtCase.sentences.length === 0) {
          return null
        }
        const convictionDates = courtCase.sentences
          .map(s => (s.convictionDate ? new Date(s.convictionDate) : null))
          .filter(date => date !== null) as Date[]
        if (convictionDates.length === 0) return null
        return new Date(
          Math.max.apply(
            null,
            convictionDates.map(d => d.getTime()),
          ),
        )
      }

      const dateA = getMostRecentConvictionDate(a)
      const dateB = getMostRecentConvictionDate(b)

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime()
      }
      if (dateA) return -1
      if (dateB) return 1
      return 0
    })
  }

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let reviewableCases = req.sessionModel.get(sessionModelFields.REVIEWABLE_COURT_CASES) as CourtCase[] | undefined
      let currentCaseIndex = req.sessionModel.get(sessionModelFields.CURRENT_CASE_INDEX) as number | undefined
      let manualRecallDecisions = req.sessionModel.get(sessionModelFields.MANUAL_RECALL_DECISIONS) as
        | (string | undefined)[]
        | undefined

      if (!reviewableCases) {
        const allCases = await getCourtCaseOptionsFromRas(req, res)
        reviewableCases = this.sortCourtCasesByMostRecentConviction(allCases)
        currentCaseIndex = 0
        manualRecallDecisions = new Array(reviewableCases.length).fill(undefined) as (string | undefined)[]

        req.sessionModel.set(sessionModelFields.REVIEWABLE_COURT_CASES, reviewableCases)
        req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, currentCaseIndex)
        req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, manualRecallDecisions)
      }

      if (currentCaseIndex === undefined || !reviewableCases || currentCaseIndex >= reviewableCases.length) {
        res.redirect(`${req.baseUrl}/check-sentences`)
        return
      }

      const originalCase = reviewableCases[currentCaseIndex]

      // Create a mutable copy for view model enhancements
      const currentCase: CourtCase & {
        sentences?: (Sentence & { formattedSentenceLength?: string; formattedConsecutiveOrConcurrent?: string })[]
      } = JSON.parse(JSON.stringify(originalCase))

      if (currentCase.sentences) {
        currentCase.sentences = currentCase.sentences.map(sentence => ({
          ...sentence,
          formattedSentenceLength: formatTerm(sentence.custodialTerm as Term | undefined), // Cast needed if custodialTerm might be missing from some Sentence types in practice
          formattedConsecutiveOrConcurrent: formatSentenceServeType(
            sentence.sentenceServeType,
            sentence.consecutiveToChargeNumber,
          ),
        }))
      }
      const previousDecision = manualRecallDecisions ? manualRecallDecisions[currentCaseIndex] : undefined

      res.locals.currentCase = currentCase
      res.locals.currentCaseIndex = currentCaseIndex
      res.locals.totalCases = reviewableCases.length
      res.locals.previousDecision = previousDecision
      res.locals.backLinkUrl = `${req.baseUrl}/manual-recall-intercept`

      super.get(req, res, next)
      // eslint-disable-next-line no-useless-return
      return
    } catch (err) {
      next(err)
      // eslint-disable-next-line no-useless-return
      return
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    super.post(req, res, next)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async saveValues(req: FormWizard.Request, res: Response, callback: (err?: any) => void): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      super.saveValues(req, res, (err?: any) => {
        if (err) {
          callback(err)
          return
        }

        const activeSentenceChoice = req.form.values.activeSentenceChoice as string | undefined
        const reviewableCases = req.sessionModel.get(sessionModelFields.REVIEWABLE_COURT_CASES) as CourtCase[]
        const currentCaseIndex = req.sessionModel.get(sessionModelFields.CURRENT_CASE_INDEX) as number
        const manualRecallDecisions = req.sessionModel.get(sessionModelFields.MANUAL_RECALL_DECISIONS) as (
          | string
          | undefined
        )[]

        if (!reviewableCases || typeof currentCaseIndex !== 'number' || !manualRecallDecisions) {
          callback(new Error('Session not properly initialized for case review in saveValues.'))
          return
        }

        if (activeSentenceChoice) {
          manualRecallDecisions[currentCaseIndex] = activeSentenceChoice
          req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, manualRecallDecisions)
        }

        const nextCaseIndex = currentCaseIndex + 1
        req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, nextCaseIndex)

        callback()
      })
    } catch (ex) {
      callback(ex)
    }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction): void {
    const reviewableCases = req.sessionModel.get(sessionModelFields.REVIEWABLE_COURT_CASES) as CourtCase[]
    const currentCaseIndex = req.sessionModel.get(sessionModelFields.CURRENT_CASE_INDEX) as number

    if (reviewableCases && typeof currentCaseIndex === 'number' && currentCaseIndex < reviewableCases.length) {
      req.session.save(err => {
        if (err) {
          next(err)
          return
        }
        res.redirect(req.originalUrl)
      })
    } else {
      super.successHandler(req, res, next)
    }
  }
}
