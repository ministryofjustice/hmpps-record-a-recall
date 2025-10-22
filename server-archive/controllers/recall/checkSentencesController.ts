import { Request, Response } from 'express'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../../middleware/loadCourtCases'
import ManageOffencesService from '../../services/manageOffencesService'

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

export default class CheckSentencesController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = CheckSentencesController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    const prisoner = res.locals.prisoner || sessionData?.prisoner

    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null

    // Filter sentences by eligibility
    const filteredCourtCases = CheckSentencesController.filterSentencesByEligibility(
      recallableCourtCases,
      revocationDate,
    )

    const offenceNameMap = await CheckSentencesController.loadOffenceNames(req, filteredCourtCases)

    const temporaryCalculation = sessionData?.temporaryCalculation as CalculatedReleaseDates
    const latestSled = temporaryCalculation?.dates?.SLED || null

    const casesWithEligibleSentences = filteredCourtCases.reduce((sum, cc) => sum + cc.eligibleSentences.length, 0)

    const manualJourney = sessionData?.manualCaseSelection || casesWithEligibleSentences === 0

    let backLink: string
    if (isEditMode) {
      backLink = `/person/${nomisId}/edit-recall/${recallId}/edit-summary`
    } else if (isEditFromCheckYourAnswers) {
      backLink = `/person/${nomisId}/record-recall/check-your-answers`
    } else {
      backLink = `/person/${nomisId}/record-recall/rtc-date`
    }

    // Handle special case for non-edit mode
    if (!isEditMode && !isEditFromCheckYourAnswers) {
      const lastVisited = sessionData?.lastVisited
      if (lastVisited?.includes('update-sentence-types-summary')) {
        backLink = `/person/${nomisId}/record-recall/update-sentence-types-summary`
      }
    }

    const cancelUrl = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`
      : `/person/${nomisId}/record-recall/confirm-cancel`

    // Store the current page for confirm-cancel return
    await CheckSentencesController.updateSessionData(req, { returnTo: req.originalUrl })

    // If not coming from a validation redirect, clear form responses
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/check-sentences', {
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
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // This page doesn't have any form fields to process,
    // it's just a confirmation page that continues to the next step

    // Clear validation and redirect
    clearValidation(req)

    if (isEditMode) {
      // Mark that this step was reviewed
      await CheckSentencesController.updateSessionData(req, {
        lastEditedStep: 'check-sentences',
      })
      // Continue to next step in edit flow
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}/recall-type`)
    }

    if (isEditFromCheckYourAnswers) {
      // Return to check-your-answers
      return res.redirect(`/person/${nomisId}/record-recall/check-your-answers`)
    }

    // Normal flow - continue to recall-type
    return res.redirect(`/person/${nomisId}/record-recall/recall-type`)
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
