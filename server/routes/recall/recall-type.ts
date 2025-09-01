import { Router, Request, Response, NextFunction } from 'express'
import { recallTypeSchema } from '../../schemas/recall/recall-type.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import { RecallTypes } from '../../@types/recallTypes'
import { sessionModelFields, getInvalidRecallTypes } from '../../helpers/formWizardHelper'
import config from '../../config'
import logger from '../../../logger'

const router = Router()

router.get('/recall-type', (req: Request, res: Response) => {
  console.log('Recall-type GET handler called')
  console.log('Session formData:', req.session?.formData)
  
  const { prisoner } = res.locals
  const isEditRecall = res.locals.isEditRecall || false
  const { recallId } = res.locals

  const backLink = `/person/${prisoner.prisonerNumber}${
    isEditRecall ? `/recall/${recallId}/edit/edit-summary` : '/record-recall/check-sentences'
  }`

  // Prepare recall type options
  const recallTypeItems = Object.values(RecallTypes).map(({ code, description }) => ({
    text: description,
    value: code,
  }))

  res.render('pages/recall/base-question', {
    fields: {
      recallType: {
        component: 'govukRadios',
        id: 'recallType',
        name: 'recallType',
        fieldset: {
          legend: {
            text: 'Select the type of recall',
            classes: 'govuk-fieldset__legend--l',
            isPageHeading: true,
          },
        },
        items: recallTypeItems,
      },
    },
    values: req.session.formData || {},
    errors: req.session.formErrors || {},
    backLink,
    prisoner,
  })

  delete req.session.formErrors
})

router.post(
  '/recall-type',
  validateWithZod(recallTypeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = req.validatedData as { recallType: string }

      // Check for recall type mismatch if feature is enabled
      let recallTypeMismatch = false
      if (config.featureToggles.unexpectedRecallTypeCheckEnabled) {
        const invalidRecallTypes = getInvalidRecallTypes(req as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recallTypeMismatch = invalidRecallTypes?.map((t: any) => t.code).includes(validatedData.recallType) || false
      }

      // Save validated data to session
      req.session.formData = {
        ...req.session.formData,
        ...validatedData,
        [sessionModelFields.RECALL_TYPE_MISMATCH]: recallTypeMismatch,
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (!req.session.journeyHistory.includes(req.path)) {
        req.session.journeyHistory.push(req.path)
      }

      // Determine next step
      const nextStep = resolveNextStep('/recall-type', req.session.formData)
      const fullPath = getFullRecallPath(nextStep, req, res)

      // Redirect to next step
      res.redirect(fullPath)
    } catch (error) {
      logger.error('Error processing recall type selection:', error)
      next(error)
    }
  },
)

export default router
