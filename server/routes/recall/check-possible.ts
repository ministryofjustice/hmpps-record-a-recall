import { Router, Request, Response, NextFunction } from 'express'
import { checkPossibleSchema } from '../../schemas/recall/check-possible.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import { getRecallRoute, sessionModelFields } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import { RecallRoutingService } from '../../services/RecallRoutingService'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'

const router = Router()

// Middleware to configure the check-possible data
async function configureCheckPossible(req: Request, res: Response, next: NextFunction) {
  const { prisoner, user } = res.locals
  const nomisId = prisoner?.prisonerNumber

  if (!nomisId || !user?.username) {
    logger.error('Missing prisoner number or username')
    return next(new Error('Missing required data'))
  }

  try {
    // Get services from req (these should be injected by middleware)
    const { services } = req as Request & {
      services?: {
        calculationService?: {
          getTemporaryCalculation: (nomisId: string, username: string) => Promise<unknown>
          getBreakdown: (id: number, username: string) => Promise<unknown>
        }
      }
    }
    if (!services) {
      logger.error('Services not available on request')
      return next(new Error('Services not configured'))
    }

    // Get calculation result and validation messages
    const calculationResult = await services.calculationService.getTemporaryCalculation(nomisId, user.username)
    const errors = calculationResult.validationMessages || []
    res.locals.validationResponse = errors

    // Get breakdown if we have calculation results
    let breakdown = null
    if (calculationResult.calculatedReleaseDates) {
      const tempCalcReqId = calculationResult.calculatedReleaseDates.calculationRequestId
      breakdown = await services.calculationService.getCalculationBreakdown(tempCalcReqId, user.username)
    }

    // Get court cases, adjustments, and existing recalls in parallel
    const [cases, existingAdjustments, existingRecalls] = await Promise.all([
      services.courtCaseService.getAllCourtCases(nomisId, user.username),
      services.adjustmentsService.searchUal(nomisId, user.username).catch((e: Error): unknown[] => {
        logger.error('Error loading adjustments:', e.message)
        return []
      }),
      services.recallService.getAllRecalls(nomisId, user.username).catch((e: Error): unknown[] => {
        logger.error('Error loading existing recalls:', e.message)
        return []
      }),
    ])

    // Use routing service for smart filtering and routing decisions
    const recallRoutingService = new RecallRoutingService()
    const routingResponse = await recallRoutingService.routeRecallWithSmartFiltering(
      nomisId,
      cases,
      existingAdjustments as any,
      existingRecalls as any,
      breakdown,
      errors,
    )

    // Store results in res.locals for use in handler
    res.locals.recallEligibility = routingResponse.eligibility
    res.locals.courtCases = routingResponse.casesToUse
    res.locals.smartOverrideApplied = routingResponse.smartOverrideApplied
    res.locals.wereCasesFilteredOut = routingResponse.wereCasesFilteredOut
    res.locals.routingResponse = routingResponse

    // Generate summarized sentence groups
    const summarisedSentenceGroups = summariseRasCases(routingResponse.casesToUse)
    res.locals.summarisedSentenceGroups = summarisedSentenceGroups

    // Store additional data if calculation succeeded
    if (calculationResult.calculatedReleaseDates && routingResponse.casesToUse.length > 0) {
      res.locals.temporaryCalculation = calculationResult.calculatedReleaseDates
      res.locals.calcReqId = calculationResult.calculatedReleaseDates.calculationRequestId
      res.locals.breakdown = breakdown
    }

    res.locals.existingAdjustments = existingAdjustments

    // Store important data in session for later steps
    req.session.formData = {
      ...req.session.formData,
      [sessionModelFields.RECALL_ELIGIBILITY]: routingResponse.eligibility,
      [sessionModelFields.COURT_CASE_OPTIONS]: routingResponse.casesToUse,
      [sessionModelFields.SUMMARISED_SENTENCES]: summarisedSentenceGroups,
      [sessionModelFields.TEMP_CALC]: res.locals.temporaryCalculation,
      [sessionModelFields.BREAKDOWN]: breakdown,
      [sessionModelFields.EXISTING_ADJUSTMENTS]: existingAdjustments,
    }

    // Update session with routing response updates
    if (routingResponse.sessionUpdates) {
      Object.entries(routingResponse.sessionUpdates).forEach(([key, value]) => {
        req.session.formData[key] = value
      })
    }

    return next()
  } catch (error) {
    logger.error('Error configuring check-possible:', error)
    return next(error)
  }
}

router.get('/check-possible', configureCheckPossible, (req: Request, res: Response) => {
  const { prisoner } = res.locals

  // Check if recall is possible
  const recallRoute = getRecallRoute(
    req as Request & { sessionModel?: unknown; session?: { formData?: Record<string, unknown> } },
  )
  const recallPossible = recallRoute && recallRoute !== 'NOT_POSSIBLE'

  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/revocation-date`

  // Render appropriate content based on recall possibility
  if (!recallPossible) {
    // Render not possible page
    res.render('pages/recall/not-possible', {
      prisoner,
      backLink,
      validationResponse: res.locals.validationResponse,
      recallEligibility: res.locals.recallEligibility,
    })
  } else {
    // Render check-possible confirmation page
    res.render('pages/recall/base-question', {
      fields: {
        confirmPossible: {
          component: 'govukRadios',
          id: 'confirmPossible',
          name: 'confirmPossible',
          fieldset: {
            legend: {
              text: 'Can you confirm that the recall can proceed?',
              classes: 'govuk-fieldset__legend--l',
            },
          },
          items: [
            { text: 'Yes, the recall can proceed', value: 'yes' },
            { text: 'No, the recall cannot proceed', value: 'no' },
          ],
        },
      },
      values: req.session.formData || {},
      errors: req.session.formErrors || {},
      backLink,
      prisoner,
      recallEligibility: res.locals.recallEligibility,
      courtCases: res.locals.courtCases,
      summarisedSentenceGroups: res.locals.summarisedSentenceGroups,
    })
  }

  delete req.session.formErrors
})

router.post(
  '/check-possible',
  validateWithZod(checkPossibleSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = req.validatedData as { confirmPossible: 'yes' | 'no' }

      // Save validated data to session
      req.session.formData = {
        ...req.session.formData,
        ...validatedData,
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (!req.session.journeyHistory.includes('/check-possible')) {
        req.session.journeyHistory.push('/check-possible')
      }

      // Determine next step based on confirmation
      let nextStep: string
      if (validatedData.confirmPossible === 'no') {
        // Go to not-possible page
        nextStep = `/person/${res.locals.prisoner.prisonerNumber}/record-recall/not-possible`
      } else {
        // Continue with recall process
        const resolvedStep = resolveNextStep('/check-possible', req.session.formData)
        nextStep = getFullRecallPath(resolvedStep, req, res)
      }

      res.redirect(nextStep)
    } catch (error) {
      logger.error('Error processing check-possible:', error)
      next(error)
    }
  },
)

export default router
