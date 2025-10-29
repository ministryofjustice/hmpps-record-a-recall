import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { DateParts, PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import logger from '../../../../../logger'
import ManageOffencesService from '../../../../services/manageOffencesService'

export type EnhancedRecallableSentence = {
  sentenceUuid?: string
  offenceCode?: string
  offenceDescription?: string
  adjustedSLED?: string
  adjustedCRD?: string
  releaseCalculationSource?: 'NOMIS' | 'CRDS' | 'UNAVAILABLE'
  sentenceLegacyData?: {
    sentenceCalcType?: string
    sentenceCategory?: string
    sentenceTypeDesc?: string
    postedDate: string
    active?: boolean
    nomisLineReference?: string
    bookingId?: number
  }
}

export type EnhancedRecallableCourtCase = {
  courtCode: string
  courtName?: string
  reference?: string
  sentences: EnhancedRecallableSentence[]
}

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

export const datePartsToDate = (p?: DateParts): Date | null =>
  p ? new Date(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`) : null

export const dateToDateParts = (d: Date): DateParts => ({
  day: d.getUTCDate(),
  month: d.getUTCMonth() + 1,
  year: d.getUTCFullYear(),
})

export default class CheckSentencesController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_CHECK_SENTENCES

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const { prisoner, recallableCourtCases } = res.locals
    const journey = req.session.createRecallJourneys[journeyId]

    const revocationDate = datePartsToDate(journey.revocationDate)

    if (!revocationDate || !recallableCourtCases) {
      logger.warn('No revocation date or recallable court cases available')
      return res.redirect(CreateRecallUrls.returnToCustodyDate(nomsId, journeyId))
    }

    const filteredCourtCases = this.filterSentencesByEligibility(recallableCourtCases, revocationDate)
    const offenceNameMap = await this.loadOffenceNames(req, filteredCourtCases)

    const casesWithEligibleSentences = filteredCourtCases.reduce((sum, cc) => sum + cc.eligibleSentences.length, 0)
    const manualJourney = journey.isManual || casesWithEligibleSentences === 0

    const backLink = journey.isCheckingAnswers
      ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
      : CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)

    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)

    return res.render('pages/recall/check-sentences', {
      prisoner,
      backLink,
      cancelUrl,
      manualJourney,
      summarisedSentencesGroups: filteredCourtCases,
      casesWithEligibleSentences,
      revocationDate,
      offenceNameMap,
      //   continueUrl: CreateRecallUrls.recallType(nomsId, journeyId), ---> TO DO: need page after this in CreateRecallUrls
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    logger.info(`User confirmed sentences for NOMS ID: ${nomsId}`)

    const nextPath = journey.isCheckingAnswers
      ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
      : CreateRecallUrls.manualSelectCases(nomsId, journeyId)

    return res.redirect(nextPath)
  }

  private filterSentencesByEligibility(
    recallableCourtCases: EnhancedRecallableCourtCase[],
    revocationDate: Date,
  ): FilteredCourtCase[] {
    logger.info(`Filtering sentences based on revocation date: ${revocationDate.toISOString().split('T')[0]}`)

    return recallableCourtCases.map(courtCase => {
      const eligibleSentences: EnhancedSentenceWithEligibility[] = []
      const ineligibleSentences: EnhancedSentenceWithEligibility[] = []

      courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
        const s: EnhancedSentenceWithEligibility = { ...sentence }

        if (!s.adjustedCRD || !s.adjustedSLED) {
          s.ineligibilityReason = 'Missing release dates'
          s.isEligible = false
          ineligibleSentences.push(s)
          return
        }

        const crd = new Date(s.adjustedCRD)
        const sled = new Date(s.adjustedSLED)

        if (revocationDate > sled) {
          s.ineligibilityReason = 'Sentence expired before revocation date'
          s.isEligible = false
          ineligibleSentences.push(s)
        } else if (revocationDate < crd) {
          s.ineligibilityReason = 'Not yet on licence at revocation date'
          s.isEligible = false
          ineligibleSentences.push(s)
        } else {
          s.isEligible = true
          eligibleSentences.push(s)
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

  private async loadOffenceNames(
    req: Request,
    filteredCourtCases: FilteredCourtCase[],
  ): Promise<Record<string, string>> {
    try {
      const offenceCodes = filteredCourtCases
        .flatMap(courtCase => [...courtCase.eligibleSentences, ...courtCase.ineligibleSentences])
        .map(sentence => sentence.offenceCode)
        .filter(Boolean)

      if (offenceCodes.length > 0) {
        const manageOffencesService = new ManageOffencesService()
        return await manageOffencesService.getOffenceMap(offenceCodes, req.user.token)
      }
      return {}
    } catch (error) {
      logger.error('Error loading offence names:', error)
      return {}
    }
  }
}
