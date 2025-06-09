import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase, Sentence, Term } from 'models'
// import {
//   getBreakdown,
//   getCourtCaseOptions,
//   getCourtCases,
//   getCrdsSentences,
//   getRevocationDate,
//   sessionModelFields,
// } from '../../helpers/formWizardHelper'
  formatTerm,
  formatSentenceServeType,
  calculateOverallSentenceLength,
  SummarisedSentenceGroup,
} from '../../utils/sentenceUtils'
import { formatDateStringToDDMMYYYY } from '../../utils/utils'
import RecallBaseController from './recallBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import getCourtCaseOptionsFromRas from '../../utils/rasCourtCasesUtils'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import logger from '../../../logger'

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

      // Create a mutable copy for the view
      const currentCase: CourtCase & {
        caseReferences?: string
        courtName?: string
        formattedOverallSentenceLength?: string
        formattedOverallConvictionDate?: string
        sentences?: (Sentence & {
          formattedSentenceLength?: string
          periodLengths?: {
            description: string
            years?: number
            months?: number
            weeks?: number
            days?: number
            periodOrder: string[]
          }[]
          formattedConsecutiveOrConcurrent?: string
          formattedOffenceDate?: string
          formattedConvictionDate?: string
          apiOffenceDescription?: string
        })[]
      } = JSON.parse(JSON.stringify(originalCase))

      currentCase.caseReferences = originalCase.reference ? originalCase.reference : 'N/A'
      currentCase.courtName = originalCase.locationName
      const overallLicenceTerm = calculateOverallSentenceLength(originalCase.sentences)
      currentCase.formattedOverallSentenceLength = formatTerm(overallLicenceTerm)
      currentCase.formattedOverallConvictionDate = formatDateStringToDDMMYYYY(originalCase.date)

      let offenceMap: Record<string, string> = {}
      if (originalCase.sentences && originalCase.sentences.length > 0) {
        const offenceCodes = [
          ...new Set(originalCase.sentences.map(sentence => sentence.offenceCode).filter(Boolean) as string[]),
        ]
        if (offenceCodes.length > 0) {
          try {
            offenceMap = await req.services.manageOffencesService.getOffenceMap(offenceCodes, res.locals.user.token)
          } catch (error) {
            logger.error('Error fetching offence descriptions from ManageOffencesService:', error)
          }
        }
      }

      if (currentCase.sentences) {
        currentCase.sentences = currentCase.sentences.map(sentence => {
          const custodialTerm = sentence.custodialTerm as Term | undefined
          const periodLengths = custodialTerm
            ? [
                {
                  description: 'Sentence length',
                  years: custodialTerm.years,
                  months: custodialTerm.months,
                  weeks: custodialTerm.weeks,
                  days: custodialTerm.days,
                  periodOrder: (['years', 'months', 'weeks', 'days'] as const).filter(
                    p => typeof custodialTerm[p] === 'number' && custodialTerm[p] > 0,
                  ),
                },
              ]
            : []

          return {
            ...sentence,
            periodLengths,
            formattedSentenceLength: formatTerm(custodialTerm),
            formattedConsecutiveOrConcurrent: formatSentenceServeType(
              sentence.sentenceServeType,
              sentence.consecutiveToChargeNumber,
            ),
            formattedOffenceDate: formatDateStringToDDMMYYYY(sentence.offenceDate),
            formattedConvictionDate: formatDateStringToDDMMYYYY(sentence.convictionDate),
            apiOffenceDescription:
              offenceMap[sentence.offenceCode] || sentence.offenceDescription || sentence.offenceCode,
          }
        })
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
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { activeSentenceChoice } = req.body
    const { _csrf, ...formResponses } = req.body // Store form responses to repopulate

    let errors
    if (!activeSentenceChoice) {
      errors = {
        list: [
          {
            href: '#activeSentenceChoice-YES',
            text: 'Select whether this case had an active sentence',
          },
        ],
        activeSentenceChoice: {
          text: 'Select whether this case had an active sentence',
        },
      }
    }

    if (errors) {
      const { nomsNumber } = req.params
      const recallId = req.sessionModel.get('recallId')

      let reviewableCases = req.sessionModel.get(sessionModelFields.REVIEWABLE_COURT_CASES) as CourtCase[] | undefined
      let currentCaseIndex = req.sessionModel.get(sessionModelFields.CURRENT_CASE_INDEX) as number | undefined
      const manualRecallDecisions = req.sessionModel.get(sessionModelFields.MANUAL_RECALL_DECISIONS) as
        | string[]
        | undefined

      if (!reviewableCases || currentCaseIndex === undefined) {
        const allCases = await getCourtCaseOptionsFromRas(req, res)
        reviewableCases = this.sortCourtCasesByMostRecentConviction(allCases)
        currentCaseIndex = parseInt(req.params.caseIndex, 10) || 0
      }

      if (
        currentCaseIndex === undefined ||
        !reviewableCases ||
        reviewableCases.length === 0 ||
        currentCaseIndex >= reviewableCases.length
      ) {
        return res.redirect(`${req.baseUrl}/${nomsNumber}/recall-type?recallId=${recallId}`)
      }
      const originalCase = reviewableCases[currentCaseIndex]

      const currentCase: CourtCase & {
        caseReferences?: string
        courtName?: string
        formattedOverallSentenceLength?: string
        formattedOverallConvictionDate?: string
        sentences?: (Sentence & {
          formattedSentenceLength?: string
          formattedConsecutiveOrConcurrent?: string
          formattedOffenceDate?: string
          formattedConvictionDate?: string
        })[]
      } = JSON.parse(JSON.stringify(originalCase))

      currentCase.caseReferences = originalCase.reference ? originalCase.reference : 'N/A'
      currentCase.courtName = originalCase.locationName
      const overallLicenceTerm = calculateOverallSentenceLength(originalCase.sentences)
      currentCase.formattedOverallSentenceLength = formatTerm(overallLicenceTerm)
      currentCase.formattedOverallConvictionDate = formatDateStringToDDMMYYYY(originalCase.date)

      if (currentCase.sentences) {
        currentCase.sentences = currentCase.sentences.map(sentence => ({
          ...sentence,
          formattedSentenceLength: formatTerm(sentence.custodialTerm as Term | undefined),
          formattedConsecutiveOrConcurrent: formatSentenceServeType(
            sentence.sentenceServeType,
            sentence.consecutiveToChargeNumber,
          ),
          formattedOffenceDate: formatDateStringToDDMMYYYY(sentence.offenceDate),
          formattedConvictionDate: formatDateStringToDDMMYYYY(sentence.convictionDate),
        }))
      }

      res.locals.nomsNumber = nomsNumber
      res.locals.currentCase = currentCase
      res.locals.currentCaseIndex = currentCaseIndex
      res.locals.totalCases = reviewableCases.length
      res.locals.previousDecision = manualRecallDecisions ? manualRecallDecisions[currentCaseIndex] : undefined
      res.locals.backLinkUrl = `${req.baseUrl}/manual-recall-intercept`

      req.sessionModel.set('errors', errors)
      req.sessionModel.set('formResponses', formResponses)
      return this.get(req, res, next)
    }

    return super.post(req, res, next)
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

//   successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
//     const selectedCases = getCourtCases(req)
//     const caseDetails = getCourtCaseOptions(req).filter((detail: CourtCase) => selectedCases.includes(detail.caseId))
//     const sentences = getCrdsSentences(req)
//     const breakdown = getBreakdown(req)
//     const summarisedSentencesGroups = summariseRasCases(caseDetails, sentences, breakdown)
//     const revocationDate = getRevocationDate(req)

//     const invalidRecallTypes = determineInvalidRecallTypes(summarisedSentencesGroups, revocationDate)

//     req.sessionModel.set(sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
//     res.locals.summarisedSentencesGroups = summarisedSentencesGroups
//     req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
//     res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(group => group.hasEligibleSentences).length
//     const sentenceCount = summarisedSentencesGroups?.flatMap((g: SummarisedSentenceGroup) =>
//       g.eligibleSentences.flatMap(s => s.sentenceId),
//     ).length
//     req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
//     res.locals.casesWithEligibleSentences = sentenceCount
//     req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

//     return super.successHandler(req, res, next)

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
      // All cases have been reviewed, or there were no cases to review.
      const manualRecallDecisions = req.sessionModel.get(sessionModelFields.MANUAL_RECALL_DECISIONS) as (
        | string
        | undefined
      )[]

      let summarisedSentenceGroupsArray: SummarisedSentenceGroup[] = []

      if (reviewableCases && manualRecallDecisions) {
        const selectedCases: CourtCase[] = []
        reviewableCases.forEach((courtCase, index) => {
          if (manualRecallDecisions[index] === 'YES') {
            selectedCases.push(courtCase)
          }
        })
        if (selectedCases.length > 0) {
          summarisedSentenceGroupsArray = summariseRasCases(selectedCases)
        }
      }

      req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroupsArray)
      super.successHandler(req, res, next)
    }
  }
}
