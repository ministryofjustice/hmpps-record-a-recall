import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { RecallableCourtCaseSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import {
  calculateOverallSentenceLength,
  formatSentenceServeType,
  formatTerm,
  SummarisedSentenceGroup,
} from '../../utils/sentenceUtils'
import { formatDateStringToDDMMYYYY } from '../../utils/utils'
import RecallBaseController from './recallBaseController'
import getCourtCaseOptionsFromRas from '../../utils/rasCourtCasesUtils'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { EnhancedRecallableCourtCase } from '../../middleware/loadCourtCases'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { COURT_MESSAGES } from '../../utils/courtConstants'
import logger from '../../../logger'

export type EnhancedSentenceForView = RecallableCourtCaseSentence & {
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
  formattedOutcome?: string
}

// Enhanced case with view-specific properties
export type EnhancedCourtCaseForView = CourtCase & {
  caseNumber?: string
  caseReferences?: string
  courtName?: string
  formattedOverallSentenceLength?: string
  formattedOverallConvictionDate?: string
  hasNonRecallableSentences?: boolean
  hasMixedSentenceTypes?: boolean
  recallableSentences?: EnhancedSentenceForView[]
  nonRecallableSentences?: EnhancedSentenceForView[]
  sentences?: EnhancedSentenceForView[]
}

export default class SelectCourtCaseController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  /**
   * Filters court cases to exclude those with only non-recallable sentences
   * and determines if cases have mixed sentence types
   */
  private filterAndClassifyCourtCases(cases: CourtCase[]): CourtCase[] {
    return cases.filter(courtCase => {
      if (!courtCase.sentences || courtCase.sentences.length === 0) {
        return false // Exclude cases with no sentences
      }

      // Only include cases that have at least one recallable sentence
      return courtCase.sentences.some(sentence => sentence.isRecallable === true)
    })
  }

  /**
   * Prepares a court case for view by adding formatted properties and enhanced sentence data
   */
  private prepareCourtCaseForView(originalCase: CourtCase): EnhancedCourtCaseForView {
    // Create a mutable copy for the view
    const currentCase: EnhancedCourtCaseForView = JSON.parse(JSON.stringify(originalCase))

    currentCase.caseNumber = originalCase.reference?.trim() || ''
    currentCase.caseReferences = originalCase.reference?.trim() || ''
    currentCase.courtName =
      (originalCase as CourtCase & { courtName?: string; courtCode?: string }).courtName ||
      originalCase.locationName ||
      'Court name not available'

    const overallLicenceTerm = calculateOverallSentenceLength(originalCase.sentences)
    currentCase.formattedOverallSentenceLength = formatTerm(overallLicenceTerm)
    currentCase.formattedOverallConvictionDate = formatDateStringToDDMMYYYY(originalCase.date)

    if (currentCase.sentences) {
      const enhancedSentences = currentCase.sentences.map(sentence => {
        const sentencePeriodLengths = sentence.periodLengths || []
        const custodialPeriod = sentencePeriodLengths.find(
          (p: unknown) =>
            p &&
            typeof p === 'object' &&
            'periodLengthType' in p &&
            (p as { periodLengthType: string }).periodLengthType === 'CUSTODIAL_TERM',
        )

        const custodialTerm = custodialPeriod
          ? {
              years: custodialPeriod.years || 0,
              months: custodialPeriod.months || 0,
              weeks: custodialPeriod.weeks || 0,
              days: custodialPeriod.days || 0,
            }
          : undefined

        // Keep the raw periodLengths from the API so the filter can transform them later
        const periodLengths = sentence.periodLengths || []

        const isUnknownSentenceType =
          sentence.sentenceTypeUuid && sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL

        const sentenceTypeDescription = isUnknownSentenceType
          ? 'Required'
          : sentence.sentenceType || sentence.sentenceLegacyData?.sentenceTypeDesc || 'Not available'

        return {
          ...sentence,
          custodialTerm,
          periodLengths,
          formattedSentenceLength: formatTerm(custodialTerm),
          formattedConsecutiveOrConcurrent: formatSentenceServeType(
            sentence.sentenceServeType,
            sentence.consecutiveToChargeNumber,
          ),
          formattedOffenceDate: sentence.convictionDate || 'Not available',
          formattedConvictionDate: sentence.convictionDate
            ? formatDateStringToDDMMYYYY(sentence.convictionDate)
            : 'Not available',
          offenceStartDate: sentence.offenceStartDate ? formatDateStringToDDMMYYYY(sentence.offenceStartDate) : null,
          offenceEndDate: sentence.offenceEndDate ? formatDateStringToDDMMYYYY(sentence.offenceEndDate) : null,
          sentenceDate: sentence.sentenceDate ? formatDateStringToDDMMYYYY(sentence.sentenceDate) : null,
          apiOffenceDescription: sentence.offenceDescription || sentence.offenceCode || 'Not available',
          sentenceTypeDescription,
          isUnknownSentenceType,
        }
      })

      // Separate recallable and non-recallable sentences in a single pass
      const { recallableSentences, nonRecallableSentences } = enhancedSentences.reduce(
        (
          acc: { recallableSentences: typeof enhancedSentences; nonRecallableSentences: typeof enhancedSentences },
          sentence,
        ) => {
          if (sentence.isRecallable === true) {
            acc.recallableSentences.push(sentence)
          } else {
            acc.nonRecallableSentences.push(sentence)
          }
          return acc
        },
        { recallableSentences: [], nonRecallableSentences: [] },
      )

      // Set properties for template rendering
      currentCase.sentences = enhancedSentences
      currentCase.recallableSentences = recallableSentences
      currentCase.nonRecallableSentences = nonRecallableSentences
      currentCase.hasNonRecallableSentences = nonRecallableSentences.length > 0
      currentCase.hasMixedSentenceTypes = recallableSentences.length > 0 && nonRecallableSentences.length > 0
    }
    return currentCase
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
        if (res.locals.recallableCourtCases && Array.isArray(res.locals.recallableCourtCases)) {
          const enhancedCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

          reviewableCases = enhancedCases
            .filter(c => c.status !== 'DRAFT' && c.isSentenced)
            .map(recallableCase => {
              const caseReference = recallableCase.reference?.trim() || ''

              return {
                caseId: recallableCase.courtCaseUuid,
                status: recallableCase.status,
                date: recallableCase.date,
                location: recallableCase.courtCode,
                courtName: recallableCase.courtName,
                courtCode: recallableCase.courtCode,
                reference: caseReference,
                sentenced: recallableCase.isSentenced,
                sentences: recallableCase.sentences || [],
              }
            })
        } else {
          reviewableCases = await getCourtCaseOptionsFromRas(req, res)
        }

        // Filter out cases with only non-recallable sentences
        reviewableCases = this.filterAndClassifyCourtCases(reviewableCases)

        reviewableCases = this.sortCourtCasesByMostRecentConviction(reviewableCases)
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
      const currentCase = this.prepareCourtCaseForView(originalCase)
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
      const currentCase = this.prepareCourtCaseForView(originalCase)

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

  async successHandler(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
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
          // Enhance selected cases with court names
          let enhancedSelectedCases = selectedCases
          try {
            const courtCodes = [...new Set(selectedCases.map(c => c.location).filter(Boolean))]
            if (courtCodes.length > 0) {
              const { username } = req.user
              const courtNamesMap = await req.services.courtService.getCourtNames(courtCodes, username)
              enhancedSelectedCases = selectedCases.map(courtCase => ({
                ...courtCase,
                locationName:
                  courtNamesMap.get(courtCase.location) || courtCase.locationName || COURT_MESSAGES.NAME_NOT_AVAILABLE,
              }))
            }
          } catch (error) {
            logger.error('Error fetching court names for manual journey:', error)
            // Continue with original cases if court name fetching fails
          }

          summarisedSentenceGroupsArray = summariseRasCases(enhancedSelectedCases)

          // Check for unknown sentences in selected cases
          const unknownSentenceIds: string[] = []
          selectedCases.forEach(courtCase => {
            if (courtCase.sentences) {
              courtCase.sentences.forEach(sentence => {
                if (sentence.sentenceTypeUuid && sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL) {
                  const { sentenceUuid } = sentence
                  if (sentenceUuid) {
                    unknownSentenceIds.push(sentenceUuid)
                  }
                }
              })
            }
          })

          // Set session data for unknown sentences
          if (unknownSentenceIds.length > 0) {
            req.sessionModel.set(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE, unknownSentenceIds)
            req.sessionModel.set(sessionModelFields.UPDATED_SENTENCE_TYPES, {})
          }
        }
      }

      req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroupsArray)
      super.successHandler(req, res, next)
    }
  }
}
