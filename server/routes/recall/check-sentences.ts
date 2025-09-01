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

const router = Router()

/**
 * Helper function to load offence names
 */
async function loadOffenceNames(req: Request, res: Response): Promise<Record<string, string>> {
  try {
    // Cast req to any for compatibility with helper functions
    const reqWithSession = req as any
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
    // eslint-disable-next-line no-console
    console.error('Error loading offence names:', error)
    return {}
  }
}

/**
 * GET handler for check-sentences page
 */
router.get('/check-sentences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Check-sentences route hit')
    console.log('Session formData:', req.session?.formData)
    console.log('Prisoner:', res.locals.prisoner)
    
    // Cast req to any for compatibility during migration
    const reqWithSession = req as any

    // Calculate eligibility and journey type
    const eligibleSentenceCount = getEligibleSentenceCount(reqWithSession)
    console.log('Eligible sentence count:', eligibleSentenceCount)
    const manualJourney = isManualCaseSelection(reqWithSession) || eligibleSentenceCount === 0

    // Get calculation data
    const calculation: CalculatedReleaseDates = getTemporaryCalc(reqWithSession)
    let summarisedSentenceGroups = getSummarisedSentenceGroups(reqWithSession)
    
    // For manual journey, if no summarised sentences, create empty groups for selected court cases
    if ((!summarisedSentenceGroups || summarisedSentenceGroups.length === 0) && manualJourney) {
      const courtCaseIds = (req.session.formData?.courtCaseIds as string[]) || []
      console.log('Manual journey - creating placeholder sentence groups for court cases:', courtCaseIds)
      summarisedSentenceGroups = courtCaseIds.map((caseId: string) => ({
        caseRefAndCourt: `Case ${caseId}`,
        caseReference: caseId,
        courtName: 'Unknown court',
        eligibleSentences: [] as any[],
        ineligibleSentences: [] as any[],
        hasEligibleSentences: true,
        hasIneligibleSentences: false,
        sentences: [] as any[],
      }))
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
    console.log('Rendering check-sentences template')
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
    console.log('Check-sentences POST handler called - START')
    console.log('Request body:', req.body)
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Session data:', req.session?.formData)
    next()
  },
  validateWithZod(checkSentencesSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Check-sentences POST handler - AFTER VALIDATION')
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
      
      console.log('Check-sentences POST - res.locals.prisoner:', res.locals.prisoner)
      console.log('Check-sentences POST - req.params:', req.params)
      
      // Check if prisoner exists
      if (!res.locals.prisoner?.prisonerNumber && !req.params.nomisId) {
        console.error('No prisoner number available for redirect!')
        return res.redirect('/error')
      }
      
      const fullPath = getFullRecallPath(nextStep, req, res)

      console.log('Check-sentences POST navigation:', {
        nextStep,
        fullPath,
        prisonerNumber: res.locals.prisoner?.prisonerNumber || req.params.nomisId
      })

      res.redirect(fullPath)
    } catch (error) {
      console.error('Check-sentences POST error:', error)
      next(error)
    }
  },
)

export default router
