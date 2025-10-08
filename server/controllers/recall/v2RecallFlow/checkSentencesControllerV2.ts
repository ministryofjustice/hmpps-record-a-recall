import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'
import { CalculatedReleaseDates } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../../../middleware/loadCourtCases'
import ManageOffencesService from '../../../services/manageOffencesService'

export type EnhancedSentenceWithEligibility = EnhancedRecallableSentence & {
  ineligibilityReason?: string
  isEligible?: boolean
}

export type FilteredCourtCase = {
  caseRefAndCourt: string
  courtCode: string
  courtName?: string
  eligibleSentences: EnhancedSentenceWithEligibility[]
  ineligibleSentences: EnhancedSentenceWithEligibility[]
  hasEligibleSentences: boolean
  hasIneligibleSentences: boolean
}

export default class CheckSentencesControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = CheckSentencesControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Detect if this is edit mode from URL path
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // Get court cases from middleware
    const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    // Get revocation date from session
    const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null

    // Filter sentences by eligibility
    const filteredCourtCases = CheckSentencesControllerV2.filterSentencesByEligibility(
      recallableCourtCases,
      revocationDate,
    )

    // Load offence names
    const offenceNameMap = await CheckSentencesControllerV2.loadOffenceNames(req, filteredCourtCases)

    // Get calculation from session
    const temporaryCalculation = sessionData?.temporaryCalculation as CalculatedReleaseDates
    const latestSled = temporaryCalculation?.dates?.SLED || null

    // Count eligible sentences
    const casesWithEligibleSentences = filteredCourtCases.reduce((sum, cc) => sum + cc.eligibleSentences.length, 0)

    // Determine if this is a manual journey
    const manualJourney = sessionData?.manualCaseSelection || casesWithEligibleSentences === 0

    // Build navigation URLs based on mode
    let backLink: string
    if (isEditMode) {
      backLink = `/person/${nomisId}/edit-recall-v2/${recallId}/edit-summary`
    } else if (isEditFromCheckYourAnswers) {
      backLink = `/person/${nomisId}/record-recall-v2/check-your-answers`
    } else {
      backLink = `/person/${nomisId}/record-recall-v2/rtc-date`
    }

    // Handle special case for non-edit mode
    if (!isEditMode && !isEditFromCheckYourAnswers) {
      const lastVisited = sessionData?.lastVisited
      if (lastVisited?.includes('update-sentence-types-summary')) {
        backLink = `/person/${nomisId}/record-recall-v2/update-sentence-types-summary`
      }
    }

    const cancelUrl = isEditMode
      ? `/person/${nomisId}/edit-recall-v2/${recallId}/confirm-cancel`
      : `/person/${nomisId}/record-recall-v2/confirm-cancel`

    // Store the current page for confirm-cancel return
    CheckSentencesControllerV2.updateSessionData(req, { returnTo: req.originalUrl })

    // If not coming from a validation redirect, clear form responses
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/v2/check-sentences', {
      prisoner,
      nomisId,
      isEditRecall: isEditMode,
      backLink,
      cancelUrl,
      latestSled,
      manualJourney,
      summarisedSentencesGroups: filteredCourtCases,
      casesWithEligibleSentences,
      revocationDate,
      offenceNameMap,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = res.locals
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // This page doesn't have any form fields to process,
    // it's just a confirmation page that continues to the next step

    // Clear validation and redirect
    clearValidation(req)

    if (isEditMode) {
      // Mark that this step was reviewed
      CheckSentencesControllerV2.updateSessionData(req, {
        lastEditedStep: 'check-sentences',
      })
      // Continue to next step in edit flow
      return res.redirect(`/person/${nomisId}/edit-recall-v2/${recallId}/recall-type`)
    }

    if (isEditFromCheckYourAnswers) {
      // Return to check-your-answers
      return res.redirect(`/person/${nomisId}/record-recall-v2/check-your-answers`)
    }

    // Normal flow - continue to recall-type
    return res.redirect(`/person/${nomisId}/record-recall-v2/recall-type`)
  }

  private static filterSentencesByEligibility(
    recallableCourtCases: EnhancedRecallableCourtCase[],
    revocationDate: Date | null,
  ): FilteredCourtCase[] {
    if (!revocationDate || !recallableCourtCases) {
      logger.warn('No revocation date or court cases available for filtering')
      return []
    }

    logger.info(`Filtering sentences based on revocation date: ${revocationDate.toISOString().split('T')[0]}`)

    return recallableCourtCases.map(courtCase => {
      const eligibleSentences: EnhancedSentenceWithEligibility[] = []
      const ineligibleSentences: EnhancedSentenceWithEligibility[] = []

      courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
        const sentenceWithEligibility = { ...sentence } as EnhancedSentenceWithEligibility

        // Check if we have the necessary dates for eligibility check
        if (!sentence.adjustedCRD || !sentence.adjustedSLED) {
          sentenceWithEligibility.ineligibilityReason = 'Missing release dates'
          sentenceWithEligibility.isEligible = false
          ineligibleSentences.push(sentenceWithEligibility)
          logger.info(`Sentence ${sentence.sentenceUuid}: Ineligible - Missing dates`)
          return
        }

        const crd = new Date(sentence.adjustedCRD)
        const sled = new Date(sentence.adjustedSLED)

        // Check eligibility based on CRD <= revocationDate <= SLED
        if (revocationDate > sled) {
          sentenceWithEligibility.ineligibilityReason = 'Sentence expired before revocation date'
          sentenceWithEligibility.isEligible = false
          ineligibleSentences.push(sentenceWithEligibility)
          logger.info(`Sentence ${sentence.sentenceUuid}: Ineligible - Expired (SLED: ${sentence.adjustedSLED})`)
        } else if (revocationDate < crd) {
          sentenceWithEligibility.ineligibilityReason = 'Not yet on licence at revocation date'
          sentenceWithEligibility.isEligible = false
          ineligibleSentences.push(sentenceWithEligibility)
          logger.info(`Sentence ${sentence.sentenceUuid}: Ineligible - Not on licence (CRD: ${sentence.adjustedCRD})`)
        } else {
          sentenceWithEligibility.isEligible = true
          eligibleSentences.push(sentenceWithEligibility)
          logger.info(
            `Sentence ${sentence.sentenceUuid}: ELIGIBLE (CRD: ${sentence.adjustedCRD}, SLED: ${sentence.adjustedSLED})`,
          )
        }
      })

      const caseReference = courtCase.reference?.trim() || 'held'
      const caseRefAndCourt =
        !courtCase.courtName || courtCase.courtName === 'Court name not available'
          ? 'Court name not available'
          : `Case ${caseReference} at ${courtCase.courtName}`

      return {
        caseRefAndCourt,
        courtCode: courtCase.courtCode,
        courtName: courtCase.courtName,
        eligibleSentences,
        ineligibleSentences,
        hasEligibleSentences: eligibleSentences.length > 0,
        hasIneligibleSentences: ineligibleSentences.length > 0,
      }
    })
  }

  private static async loadOffenceNames(
    req: Request,
    filteredCourtCases: FilteredCourtCase[],
  ): Promise<Record<string, string>> {
    try {
      const offenceCodes = filteredCourtCases
        .flatMap(courtCase => [...courtCase.eligibleSentences, ...courtCase.ineligibleSentences])
        .map(sentence => sentence.offenceCode)
        .filter(code => code)

      if (offenceCodes.length > 0) {
        const manageOffencesService = new ManageOffencesService()
        return manageOffencesService.getOffenceMap(offenceCodes, req.user.token)
      }
      return {}
    } catch (error) {
      logger.error('Error loading offence names:', error)
      return {}
    }
  }
}
