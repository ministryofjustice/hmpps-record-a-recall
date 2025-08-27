import { Router, Request, Response, NextFunction } from 'express'
import { min } from 'date-fns'
import { revocationDateSchema } from '../../../schemas/recall/dates.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import { resolveNextStep } from '../../../migration/journey-resolver'

import { RecallRoutingService } from '../../../services/RecallRoutingService'
import { sessionModelFields } from '../../../helpers/formWizardHelper'
import {
  getCrdsSentencesFromSession,
  getCourtCaseOptionsFromSession,
  getExistingAdjustmentsFromSession,
} from '../../../helpers/migratedFormHelper'
import logger from '../../../../logger'

const router = Router()

router.get('/revocation-date', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const isEditRecall = res.locals.isEditRecall || false
  const { recallId } = res.locals

  const backLink = `/person/${prisoner.prisonerNumber}${isEditRecall ? `/recall/${recallId}/edit/edit-summary` : ''}`

  res.render('pages/recall/base-question', {
    fields: {
      revocationDate: {
        component: 'govukDateInput',
        id: 'revocationDate',
        name: 'revocationDate',
        fieldset: {
          legend: {
            text: 'Enter the date of revocation',
            classes: 'govuk-fieldset__legend--l',
          },
        },
        hint: {
          text: 'For example, 27 3 2007',
        },
        nameForErrors: 'Recall date',
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
  '/revocation-date',
  validateWithZod(revocationDateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = req.validatedData as { revocationDate: string }
      const revocationDate = new Date(validatedData.revocationDate)
      const { prisoner } = res.locals

      const sentences = getCrdsSentencesFromSession(req) || []

      if (sentences.length) {
        const earliestSentenceDate = min(sentences.map(s => new Date(s.sentenceDate)))
        if (revocationDate < earliestSentenceDate) {
          req.session.formErrors = {
            revocationDate: {
              type: 'validation',
              message: 'The recall date must be after the earliest sentence date',
            },
          }
          req.session.formValues = req.body
          res.redirect(req.originalUrl)
          return
        }
      }

      const recallRoutingService = new RecallRoutingService()

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courtCases = getCourtCaseOptionsFromSession(req).filter((c: any) => c.status !== 'DRAFT')
        const adjustments = getExistingAdjustmentsFromSession(req)
        const existingRecalls = res.locals.recalls || []

        const journeyData = {
          ...req.session.formData,
          revocationDate: validatedData.revocationDate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any

        const routingResponse = await recallRoutingService.routeRecall({
          nomsId: prisoner.prisonerNumber,
          revocationDate,
          courtCases,
          adjustments,
          existingRecalls,
          calculationBreakdown: null,
          validationMessages: [],
          journeyData,
        })

        if (routingResponse.validationMessages.length > 0) {
          const validationError = routingResponse.validationMessages[0]
          let errorMessage = 'Invalid revocation date'

          if (validationError.code === 'ADJUSTMENT_FUTURE_DATED_UAL') {
            errorMessage = 'The recall date cannot be within an adjustment period'
          } else if (validationError.code === 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER') {
            errorMessage = 'The revocation date overlaps with a fixed term recall'
          } else if (validationError.code === 'CONCURRENT_CONSECUTIVE_SENTENCES_DURATION') {
            errorMessage = 'The revocation date is on or before an existing recall'
          }

          req.session.formErrors = {
            revocationDate: {
              type: 'validation',
              message: errorMessage,
            },
          }
          req.session.formValues = req.body
          res.redirect(req.originalUrl)
          return
        }

        if (!req.session.formData) {
          req.session.formData = {}
        }

        req.session.formData.revocationDate = validatedData.revocationDate
        req.session.formData[sessionModelFields.INVALID_RECALL_TYPES] =
          routingResponse.eligibilityDetails.invalidRecallTypes
        req.session.formData[sessionModelFields.ELIGIBLE_SENTENCE_COUNT] =
          routingResponse.eligibilityDetails.eligibleSentenceCount
        req.session.formData[sessionModelFields.MANUAL_CASE_SELECTION] =
          routingResponse.eligibilityDetails.hasNonSdsSentences
        req.session.formData.routingResponse = routingResponse
      } catch (error) {
        logger.error('Routing service validation failed:', error)
        req.session.formData = {
          ...req.session.formData,
          revocationDate: validatedData.revocationDate,
          [sessionModelFields.MANUAL_CASE_SELECTION]: true,
        }
      }

      const nextStep = resolveNextStep('/revocation-date', req.session.formData)
      res.redirect(nextStep)
    } catch (error) {
      logger.error('Error processing revocation date:', error)
      next(error)
    }
  },
)

export default router
