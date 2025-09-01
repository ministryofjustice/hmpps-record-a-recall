import { Router, Response, NextFunction, Request } from 'express'
import { searchSchema } from '../../schemas/search.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import logger from '../../../logger'
import config from '../../config'

const router = Router()

// Check for redirect middleware (extracted from PersonSearchController)
function checkForRedirect(req: Request, res: Response, next: NextFunction): void {
  // Check if not in local development and redirect to DPS home
  const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

  if (!isLocalDevelopment) {
    res.redirect(config.applications.digitalPrisonServices.url)
    return
  }

  next()
}

// Root path handler - redirect to nomisId (matches HMPO wizard behavior)
router.get('/', checkForRedirect, (req: Request, res: Response) => {
  // Reset session data (entryPoint: true, reset: true, resetJourney: true)
  delete req.session.formData
  delete req.session.formErrors
  delete req.session.formValues

  // Redirect to nomisId step (skip: true, next: 'nomisId')
  res.redirect('/search/nomisId')
})

// GET handler - render the search form
router.get('/nomisId', checkForRedirect, (req: Request, res: Response) => {
  const values = req.session.formValues || req.session.formData || {}
  const errors = req.session.formErrors || {}
  const errorMessage = req.flash('errorMessage')

  res.render('pages/search/search', {
    values,
    errors,
    errorMessage,
    fields: {
      nomisId: {
        component: 'govukInput',
        id: 'nomisId',
        name: 'nomisId',
        classes: 'govuk-!-width-three-quarters nomis-id-text-input',
        label: {
          text: 'NOMIS ID',
          classes: 'govuk-fieldset__legend--m govuk-!-display-none',
        },
        autocomplete: 'off',
        value: values.nomisId,
        errorMessage: errors.nomisId,
      },
    },
  })

  // Clear errors after rendering
  delete req.session.formErrors
  delete req.session.formValues
})

// POST handler - validate and process the search
router.post(
  '/nomisId',
  checkForRedirect,
  validateWithZod(searchSchema),
  async (
    req: Request & {
      validatedData?: unknown
      services?: { prisonerService: { getPrisonerDetails: (id: string, user: string) => Promise<unknown> } }
      user?: { username: string }
    },
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validatedData = req.validatedData as { nomisId: string }
      // The schema already transforms to uppercase and trims, so we just use the validated data directly
      const { nomisId } = validatedData
      const { prisonerService } = req.services!
      const { username } = req.user!

      try {
        await prisonerService.getPrisonerDetails(nomisId, username)
      } catch (error) {
        logger.error(error)
        req.session.formErrors = {
          nomisId: {
            type: 'validation',
            message: 'Enter a valid NOMIS ID',
          },
        }
        req.session.formValues = req.body
        res.redirect(req.originalUrl)
        return
      }

      // Save to session and redirect
      if (!req.session.formData) {
        req.session.formData = {}
      }
      req.session.formData.nomisId = nomisId
      res.redirect(`/person/${nomisId}`)
    } catch (error) {
      next(error)
    }
  },
)

export default router
