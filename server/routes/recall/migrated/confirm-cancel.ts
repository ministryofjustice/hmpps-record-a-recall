import { Router, Request, Response } from 'express'
import { confirmCancelSchema } from '../../../schemas/recall/choices.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import { entrypointUrl } from '../../../utils/utils'

const router = Router()

// Session field keys (replacing HMPO sessionModelFields)
const RETURN_TO_KEY = 'returnTo'
const ENTRYPOINT_KEY = 'entrypoint'

// Helper to get entrypoint from session
function getEntrypointFromSession(req: Request): string {
  const entrypointFromData = req.session?.formData?.[ENTRYPOINT_KEY] as string | undefined
  const entrypointFromQuery = req.query.entrypoint as string | undefined
  return entrypointFromData || entrypointFromQuery || ''
}

// Helper to get journey history
function getLastVisited(req: Request): string {
  const journeyHistory = req.session?.journeyHistory || []
  return journeyHistory[journeyHistory.length - 1] || ''
}

router.get('/confirm-cancel', (req: Request, res: Response) => {
  const { nomisId, recallId } = res.locals
  const lastVisited = getLastVisited(req)

  // Initialize session data if needed
  if (!req.session.formData) {
    req.session.formData = {}
  }

  // Store return location if not already on confirm-cancel page
  if (!lastVisited.includes('confirm-cancel')) {
    req.session.formData[RETURN_TO_KEY] = lastVisited
  }

  const backLink = req.session.formData[RETURN_TO_KEY] || lastVisited
  const isEditRecall = !!recallId
  const journeyBaseLink = `/person/${nomisId}/${isEditRecall ? `edit-recall/${recallId}` : 'record-recall'}`

  res.render('base-question', {
    nomisId,
    recallId,
    hideCancel: true,
    backLink,
    cancelLink: `${journeyBaseLink}/confirm-cancel`,
    values: req.session.formData || {},
    errors: req.session.formErrors || {},
    fields: {
      confirmCancel: {
        component: 'govukRadios',
        id: 'confirmCancel',
        name: 'confirmCancel',
        fieldset: {
          legend: {
            text: 'Are you sure you want to cancel recording a recall?',
            classes: 'govuk-fieldset__legend--l',
          },
        },
        nameForErrors: 'if you are sure you want to cancel recording a recall',
        items: [
          { text: 'Yes, cancel the recall', value: 'true' },
          { text: 'No, go back to the recall', value: 'false' },
        ],
      },
    },
  })

  // Clear errors after rendering
  delete req.session.formErrors
})

router.post('/confirm-cancel', validateWithZod(confirmCancelSchema), (req: Request, res: Response) => {
  const { nomisId } = res.locals
  const validatedData = req.validatedData as { confirmCancel: 'true' | 'false' }
  const returnTo = req.session?.formData?.[RETURN_TO_KEY] as string | undefined
  const entrypoint = getEntrypointFromSession(req)

  if (validatedData.confirmCancel === 'true') {
    // User confirmed cancellation - clear session and redirect
    const cancelRedirectUrl = entrypointUrl(entrypoint, nomisId)

    // Clear form data but preserve important session info
    delete req.session.formData
    delete req.session.formErrors
    delete req.session.formValues
    delete req.session.journeyHistory

    return res.redirect(cancelRedirectUrl)
  }

  // User chose not to cancel - go back to where they were
  if (req.session.formData) {
    delete req.session.formData[RETURN_TO_KEY]
  }

  return res.redirect(returnTo || '/')
})

export default router
