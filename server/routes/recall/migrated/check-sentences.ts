import { Router, Request, Response, NextFunction } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { checkSentencesSchema } from '../../../schemas/recall/check-sentences.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import { resolveNextStep } from '../../../migration/journey-resolver'
import {
  getEligibleSentenceCount,
  getSummarisedSentenceGroups,
  getTemporaryCalc,
  isManualCaseSelection,
} from '../../../helpers/formWizardHelper'
import ManageOffencesService from '../../../services/manageOffencesService'
import { CalculatedReleaseDates } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

const router = Router()

/**
 * Helper function to load offence names
 */
async function loadOffenceNames(req: Request, res: Response): Promise<Record<string, string>> {
  try {
    // Cast req to include sessionModel for compatibility
    const reqWithSession = req as unknown as FormWizard.Request
    // Check if required properties exist
    if (!reqWithSession.sessionModel || !reqWithSession.user?.token) {
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
    // Cast req to include sessionModel for compatibility during migration
    const reqWithSession = req as unknown as FormWizard.Request

    // Check if we have the required sessionModel for HMPO functions
    if (!reqWithSession.sessionModel) {
      // If no sessionModel (e.g., in tests or migrated mode), use default values
      const prisoner = res.locals.prisoner || {}
      res.render('check-sentences', {
        values: req.session.formData || {},
        errors: req.session.formErrors || {},
        latestSled: null,
        manualJourney: false,
        summarisedSentencesGroups: [],
        casesWithEligibleSentences: 0,
        offenceNameMap: {},
        prisoner,
        backLink: `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`,
        isEditRecall: false,
        recallId: null,
      })
      delete req.session.formErrors
      return
    }

    // Calculate eligibility and journey type
    const eligibleSentenceCount = getEligibleSentenceCount(reqWithSession)
    const manualJourney = isManualCaseSelection(reqWithSession) || eligibleSentenceCount === 0

    // Get calculation data
    const calculation: CalculatedReleaseDates = getTemporaryCalc(reqWithSession)
    const summarisedSentenceGroups = getSummarisedSentenceGroups(reqWithSession)

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
    res.render('check-sentences', {
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
  validateWithZod(checkSentencesSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
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

      res.redirect(nextStep)
    } catch (error) {
      next(error)
    }
  },
)

export default router
