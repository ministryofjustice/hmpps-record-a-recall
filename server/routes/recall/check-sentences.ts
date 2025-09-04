import { Router, Request, Response, NextFunction } from 'express'
import { checkSentencesSchema } from '../../schemas/recall/check-sentences.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import {
  getEligibleSentenceCount,
  getSummarisedSentenceGroups,
  getTemporaryCalc,
  isManualCaseSelection,
} from '../../helpers/formWizardHelper'
import ManageOffencesService from '../../services/manageOffencesService'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import { SummarisedSentence, SummarisedSentenceGroup } from '../../utils/sentenceUtils'
import { RecallableCourtCaseSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const router = Router()

/**
 * Helper function to load offence names
 */
async function loadOffenceNames(req: Request, res: Response): Promise<Record<string, string>> {
  try {
    // Cast req to extended type for compatibility with helper functions
    const reqWithSession = req as Request & {
      sessionModel?: unknown
      session?: { formData?: Record<string, unknown> }
      user?: { token?: string }
    }
    // Check if required properties exist
    if (!reqWithSession.session || !reqWithSession.user?.token) {
      return {}
    }

    const summarisedSentenceGroups = getSummarisedSentenceGroups(reqWithSession)
    const offenceCodes = summarisedSentenceGroups
      .flatMap(group => group.sentences || [])
      .map(charge => charge.offenceCode)
      .filter(code => code)

    if (offenceCodes.length > 0) {
      const manageOffencesService = new ManageOffencesService()
      return await manageOffencesService.getOffenceMap(offenceCodes, reqWithSession.user.token)
    }
    return {}
  } catch (error) {
    // Log error but continue with empty offence map

    logger.error('Error loading offence names:', error)
    return {}
  }
}

/**
 * GET handler for check-sentences page
 */
router.get('/check-sentences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Check-sentences route hit', {
      formData: req.session?.formData,
      prisoner: res.locals.prisoner,
    })

    // Cast req to extended type for compatibility during migration
    const reqWithSession = req as Request & { sessionModel?: unknown; session?: { formData?: Record<string, unknown> } }

    // Calculate eligibility and journey type
    const eligibleSentenceCount = getEligibleSentenceCount(reqWithSession)
    logger.debug('Eligible sentence count:', eligibleSentenceCount)
    const manualJourney = isManualCaseSelection(reqWithSession) || eligibleSentenceCount === 0

    // Get calculation data
    const calculation: CalculatedReleaseDates = getTemporaryCalc(reqWithSession)
    let summarisedSentenceGroups = getSummarisedSentenceGroups(reqWithSession)

    // For manual journey, if no summarised sentences, create empty groups for selected court cases
    if ((!summarisedSentenceGroups || summarisedSentenceGroups.length === 0) && manualJourney) {
      const courtCaseIds = (req.session.formData?.courtCaseIds as string[]) || []
      logger.debug('Manual journey - creating placeholder sentence groups for court cases:', courtCaseIds)
      summarisedSentenceGroups = courtCaseIds.map((caseId: string) => ({
        caseRefAndCourt: `Case ${caseId}`,
        caseReference: caseId,
        courtName: 'Unknown court',
        eligibleSentences: [] as SummarisedSentence[],
        ineligibleSentences: [] as SummarisedSentence[],
        hasEligibleSentences: true,
        hasIneligibleSentences: false,
        sentences: [] as RecallableCourtCaseSentence[],
      })) as SummarisedSentenceGroup[]
    }

    // Load offence names
    const offenceNameMap = await loadOffenceNames(req, res)

    // Prepare locals for template
    const prisoner = res.locals.prisoner || {}
    const isEditRecall = req.session.formData?.isEdit || false
    const recallId = req.session.formData?.recallId

    // Determine back link
    let backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
    const lastVisited = req.session.formData?.lastVisited as string | undefined
    if (lastVisited && lastVisited.includes('update-sentence-types-summary')) {
      backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`
    } else if (isEditRecall) {
      backLink = `/person/${prisoner.prisonerNumber}/recall/${recallId}/edit/edit-summary`
    }

    // Render the template with all necessary data
    logger.debug('Rendering check-sentences template')
    res.render('pages/recall/check-sentences', {
      values: req.session.formData || {},
      errors: req.session.formErrors || {},
      latestSled: calculation?.dates?.SLED,
      manualJourney,
      summarisedSentencesGroups: summarisedSentenceGroups,
      casesWithEligibleSentences: eligibleSentenceCount,
      offenceNameMap,
      prisoner,
      backLink,
      isEditRecall,
      recallId,
    })

    // Clear any errors after rendering
    delete req.session.formErrors
  } catch (error) {
    next(error)
  }
})

/**
 * POST handler for check-sentences page
 * This page doesn't have user input, just handles navigation
 */
router.post(
  '/check-sentences',
  (req: Request, res: Response, next: NextFunction) => {
    logger.debug('Check-sentences POST handler called', {
      body: req.body,
      method: req.method,
      url: req.url,
      sessionData: req.session?.formData,
    })
    next()
  },
  validateWithZod(checkSentencesSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Check-sentences POST handler - AFTER VALIDATION')
      // No data to save as this is just a confirmation/display page
      // The validated data would be empty object: {}

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (!req.session.journeyHistory.includes('/check-sentences')) {
        req.session.journeyHistory.push('/check-sentences')
      }

      // Determine next step - from steps.ts, next is 'recall-type'
      const nextStep = resolveNextStep('/check-sentences', req.session.formData || {})

      logger.debug('Check-sentences POST context', {
        prisoner: res.locals.prisoner,
        params: req.params,
      })

      // Check if prisoner exists
      if (!res.locals.prisoner?.prisonerNumber && !req.params.nomisId) {
        logger.error('No prisoner number available for redirect!')
        return res.redirect('/error')
      }

      const fullPath = getFullRecallPath(nextStep, req, res)

      logger.debug('Check-sentences POST navigation:', {
        nextStep,
        fullPath,
        prisonerNumber: res.locals.prisoner?.prisonerNumber || req.params.nomisId,
      })

      return res.redirect(fullPath)
    } catch (error) {
      logger.error('Check-sentences POST error:', error)
      return next(error)
    }
  },
)

export default router
