import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'
import getCourtCaseOptionsFromRas from '../../../utils/rasCourtCasesUtils'
import { summariseRasCases } from '../../../utils/CaseSentenceSummariser'
import { EnhancedRecallableCourtCase } from '../../../middleware/loadCourtCases'
import SENTENCE_TYPE_UUIDS from '../../../utils/sentenceTypeConstants'
import { COURT_MESSAGES } from '../../../utils/courtConstants'
import {
  calculateOverallSentenceLength,
  formatSentenceServeType,
  formatTerm,
  SummarisedSentenceGroup,
} from '../../../utils/sentenceUtils'
import { formatDateStringToDDMMYYYY } from '../../../utils/utils'
import { RecallableCourtCaseSentence } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

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
  formattedCountNumber: string
  formattedLineNumber: string
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

export default class SelectCourtCaseControllerV2 extends BaseController {
  /**
   * Filters court cases to exclude those with only non-recallable sentences
   * and determines if cases have mixed sentence types
   */
  private static filterAndClassifyCourtCases(cases: CourtCase[]): CourtCase[] {
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
  private static prepareCourtCaseForView(originalCase: CourtCase): EnhancedCourtCaseForView {
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

  private static sortCourtCasesByMostRecentConviction(cases: CourtCase[]): CourtCase[] {
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

  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionData = SelectCourtCaseControllerV2.getSessionData(req)
      const { nomisId, recallId } = res.locals

      // Get prisoner data from session or res.locals
      const prisoner = res.locals.prisoner || sessionData?.prisoner

      // Detect if this is edit mode from URL path
      const isEditMode = req.originalUrl.includes('/edit-recall-v2/')

      // Get or initialize reviewable cases
      let reviewableCases = sessionData?.reviewableCourtCases as CourtCase[] | undefined
      let currentCaseIndex = sessionData?.currentCaseIndex as number | undefined
      let manualRecallDecisions = sessionData?.manualRecallDecisions as (string | undefined)[] | undefined

      if (!reviewableCases) {
        // First check if we have court cases from the session (stored by checkPossibleControllerV2)
        const courtCaseOptions = sessionData?.courtCaseOptions as CourtCase[] | undefined
        if (courtCaseOptions && courtCaseOptions.length > 0) {
          reviewableCases = courtCaseOptions
        } else if (res.locals.recallableCourtCases && Array.isArray(res.locals.recallableCourtCases)) {
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
                locationName: recallableCase.courtName,
                courtName: recallableCase.courtName,
                courtCode: recallableCase.courtCode,
                reference: caseReference,
                sentenced: recallableCase.isSentenced,
                sentences: recallableCase.sentences || [],
              }
            })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reviewableCases = await getCourtCaseOptionsFromRas(req as any, res)
        }

        // Filter out cases with only non-recallable sentences
        reviewableCases = SelectCourtCaseControllerV2.filterAndClassifyCourtCases(reviewableCases)

        reviewableCases = SelectCourtCaseControllerV2.sortCourtCasesByMostRecentConviction(reviewableCases)
        currentCaseIndex = 0
        manualRecallDecisions = new Array(reviewableCases.length).fill(undefined) as (string | undefined)[]

        // Update session with initial data
        SelectCourtCaseControllerV2.updateSessionData(req, {
          reviewableCourtCases: reviewableCases,
          currentCaseIndex,
          manualRecallDecisions,
        })
      }

      if (currentCaseIndex === undefined || !reviewableCases || currentCaseIndex >= reviewableCases.length) {
        const redirectUrl = isEditMode
          ? `/person/${nomisId}/edit-recall-v2/${recallId}/check-sentences`
          : `/person/${nomisId}/record-recall-v2/check-sentences`
        res.redirect(redirectUrl)
        return
      }

      const originalCase = reviewableCases[currentCaseIndex]
      const currentCase = SelectCourtCaseControllerV2.prepareCourtCaseForView(originalCase)
      const previousDecision = manualRecallDecisions ? manualRecallDecisions[currentCaseIndex] : undefined

      // Build navigation URLs based on mode
      const backLink = isEditMode
        ? `/person/${nomisId}/edit-recall-v2/${recallId}/edit-summary`
        : `/person/${nomisId}/record-recall-v2/manual-recall-intercept`
      const cancelUrl = isEditMode
        ? `/person/${nomisId}/edit-recall-v2/${recallId}/confirm-cancel`
        : `/person/${nomisId}/record-recall-v2/confirm-cancel`

      // Store return URL for cancel flow
      SelectCourtCaseControllerV2.updateSessionData(req, {
        returnTo: req.originalUrl,
      })

      // Load form data from session if not from validation
      if (!res.locals.formResponses) {
        res.locals.formResponses = previousDecision ? { activeSentenceChoice: previousDecision } : {}
      }

      res.render('pages/recall/v2/select-court-cases', {
        prisoner,
        nomisId,
        isEditRecall: isEditMode,
        backLink,
        cancelUrl,
        currentCase,
        currentCaseIndex,
        totalCases: reviewableCases.length,
        previousDecision,
        validationErrors: res.locals.validationErrors,
        formResponses: res.locals.formResponses,
        pageHeading: 'Record a recall',
        forceUnknownSentenceTypes: process.env.FORCE_UNKNOWN_SENTENCE_TYPES === 'true',
      })
    } catch (err) {
      logger.error('Error in SelectCourtCaseControllerV2.get:', err)
      next(err)
    }
  }

  static async post(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionData = SelectCourtCaseControllerV2.getSessionData(req)
      const { nomisId, recallId } = res.locals
      const { activeSentenceChoice } = req.body
      const isEditMode = req.originalUrl.includes('/edit-recall-v2/')

      const reviewableCases = sessionData?.reviewableCourtCases as CourtCase[]
      const currentCaseIndex = sessionData?.currentCaseIndex as number
      const manualRecallDecisions = sessionData?.manualRecallDecisions as (string | undefined)[]

      if (!reviewableCases || typeof currentCaseIndex !== 'number' || !manualRecallDecisions) {
        logger.error('Session not properly initialized for case review')
        const redirectUrl = isEditMode
          ? `/person/${nomisId}/edit-recall-v2/${recallId}/check-sentences`
          : `/person/${nomisId}/record-recall-v2/check-sentences`
        return res.redirect(redirectUrl)
      }

      // Store the decision for this case
      if (activeSentenceChoice) {
        manualRecallDecisions[currentCaseIndex] = activeSentenceChoice
        SelectCourtCaseControllerV2.updateSessionData(req, {
          manualRecallDecisions,
        })
      }

      // Move to the next case
      const nextCaseIndex = currentCaseIndex + 1
      SelectCourtCaseControllerV2.updateSessionData(req, {
        currentCaseIndex: nextCaseIndex,
      })

      // Check if there are more cases to review
      if (nextCaseIndex < reviewableCases.length) {
        // Redirect to the same page to review the next case
        clearValidation(req)
        return res.redirect(req.originalUrl)
      }

      // All cases have been reviewed
      const selectedCases: CourtCase[] = []
      reviewableCases.forEach((courtCase, index) => {
        if (manualRecallDecisions[index] === 'YES') {
          selectedCases.push(courtCase)
        }
      })

      // Store both as selectedCases and courtCaseOptions for consistency
      SelectCourtCaseControllerV2.updateSessionData(req, {
        selectedCases,
        courtCaseOptions: selectedCases,
      })

      let summarisedSentenceGroupsArray: SummarisedSentenceGroup[] = []
      let unknownSentenceIds: string[] = []

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
        // Reset and populate unknownSentenceIds
        unknownSentenceIds = []
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
          SelectCourtCaseControllerV2.updateSessionData(req, {
            unknownSentencesToUpdate: unknownSentenceIds,
            updatedSentenceTypes: {},
          })
        }
      }

      // Store the summarized sentences
      SelectCourtCaseControllerV2.updateSessionData(req, {
        summarisedSentences: summarisedSentenceGroupsArray,
      })

      // Clear validation and redirect to the next appropriate step
      clearValidation(req)

      // Check if no cases were selected
      if (summarisedSentenceGroupsArray.length === 0) {
        const redirectUrl = isEditMode
          ? `/person/${nomisId}/edit-recall-v2/${recallId}/no-cases-selected`
          : `/person/${nomisId}/record-recall-v2/no-cases-selected`
        return res.redirect(redirectUrl)
      }

      if (unknownSentenceIds.length > 0) {
        const redirectUrl = isEditMode
          ? `/person/${nomisId}/edit-recall-v2/${recallId}/update-sentence-types-summary`
          : `/person/${nomisId}/record-recall-v2/update-sentence-types-summary`
        return res.redirect(redirectUrl)
      }

      // Proceed to next step
      if (isEditMode) {
        // Mark that this step was edited
        SelectCourtCaseControllerV2.updateSessionData(req, {
          lastEditedStep: 'select-court-cases',
        })
        // Continue to next step in edit flow
        return res.redirect(`/person/${nomisId}/edit-recall-v2/${recallId}/check-sentences`)
      }
      // Normal flow - proceed to check sentences
      return res.redirect(`/person/${nomisId}/record-recall-v2/check-sentences`)
    } catch (err) {
      logger.error('Error in SelectCourtCaseControllerV2.post:', err)
      return next(err)
    }
  }
}
