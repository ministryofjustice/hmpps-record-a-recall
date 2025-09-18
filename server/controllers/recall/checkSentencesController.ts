import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  getEligibleSentenceCount,
  getTemporaryCalc,
  isManualCaseSelection,
  getRevocationDate,
} from '../../helpers/formWizardHelper'
import ManageOffencesService from '../../services/manageOffencesService'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../../middleware/loadCourtCases'

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

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.filterSentencesByEligibility)
    this.use(this.loadOffenceNames)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)

    const filteredCourtCases = res.locals.filteredCourtCases || []

    res.locals.latestSled = calculation?.dates?.SLED || null
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = filteredCourtCases
    res.locals.casesWithEligibleSentences = eligibleSentenceCount
    res.locals.revocationDate = getRevocationDate(req)

    const locals = super.locals(req, res)
    const { prisoner } = res.locals

    let backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
    if (req.journeyModel.attributes.lastVisited?.includes('update-sentence-types-summary')) {
      backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`
    } else if (locals.isEditRecall) {
      backLink = `/person/${prisoner.prisonerNumber}/recall/${locals.recallId}/edit/edit-summary`
    }

    return { ...locals, backLink }
  }

  async getOffenceNameTitle(req: FormWizard.Request, offenceCodes: string[]) {
    return new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
  }

  async filterSentencesByEligibility(req: FormWizard.Request, res: Response, next: () => void): Promise<void> {
    try {
      const revocationDate = getRevocationDate(req)
      const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

      if (!revocationDate || !recallableCourtCases) {
        logger.warn('No revocation date or court cases available for filtering')
        res.locals.filteredCourtCases = []
        return next()
      }

      logger.info(`Filtering sentences based on revocation date: ${revocationDate.toISOString().split('T')[0]}`)

      const filteredCourtCases: FilteredCourtCase[] = recallableCourtCases.map(courtCase => {
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

      const totalEligible = filteredCourtCases.reduce((sum, cc) => sum + cc.eligibleSentences.length, 0)
      const totalIneligible = filteredCourtCases.reduce((sum, cc) => sum + cc.ineligibleSentences.length, 0)
      logger.info(`Filtering complete: ${totalEligible} eligible, ${totalIneligible} ineligible sentences`)

      res.locals.filteredCourtCases = filteredCourtCases
      return next()
    } catch (error) {
      logger.error('Error filtering sentences by eligibility:', error)
      res.locals.filteredCourtCases = []
      return next()
    }
  }

  async loadOffenceNames(req: FormWizard.Request, res: Response, next: () => void) {
    try {
      const filteredCourtCases = res.locals.filteredCourtCases as FilteredCourtCase[]
      const offenceCodes = filteredCourtCases
        .flatMap(courtCase => [...courtCase.eligibleSentences, ...courtCase.ineligibleSentences])
        .map(sentence => sentence.offenceCode)
        .filter(code => code)

      if (offenceCodes.length > 0) {
        const offenceNameMap = await this.getOffenceNameTitle(req, offenceCodes)
        res.locals.offenceNameMap = offenceNameMap
      } else {
        res.locals.offenceNameMap = {}
      }
      next()
    } catch (error) {
      logger.error('Error loading offence names:', error)
      res.locals.offenceNameMap = {}
      next()
    }
  }
}
