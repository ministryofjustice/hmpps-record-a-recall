import { Router, Request, Response, NextFunction } from 'express'
import { min } from 'date-fns'
import { revocationDateSchema } from '../../schemas/recall/dates.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'

import { RecallRoutingService } from '../../services/RecallRoutingService'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import {
  getCrdsSentencesFromSession,
  getCourtCaseOptionsFromSession,
  getExistingAdjustmentsFromSession,
} from '../../helpers/migratedFormHelper'
import logger from '../../../logger'

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
        namePrefix: 'revocationDate',
        fieldset: {
          legend: {
            text: 'Enter the date of revocation',
            classes: 'govuk-fieldset__legend--l',
          },
        },
        hint: {
          text: 'For example, 27 3 2007',
        },
        items: [
          {
            name: 'day',
            classes: 'govuk-input--width-2',
            value: req.session.formData?.['revocationDate-day'],
          },
          {
            name: 'month',
            classes: 'govuk-input--width-2', 
            value: req.session.formData?.['revocationDate-month'],
          },
          {
            name: 'year',
            classes: 'govuk-input--width-4',
            value: req.session.formData?.['revocationDate-year'],
          },
        ],
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

// Middleware to combine date parts into a single field
function combineDateParts(req: Request, res: Response, next: NextFunction) {
  const day = req.body['revocationDate-day']
  const month = req.body['revocationDate-month']
  const year = req.body['revocationDate-year']
  
  if (day && month && year) {
    // Convert to YYYY-MM-DD format expected by the schema
    req.body.revocationDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  next()
}

router.post(
  '/revocation-date',
  combineDateParts,
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
        // For Cypress tests, use res.locals data if session data is not available
        let courtCases = getCourtCaseOptionsFromSession(req)
        if ((!courtCases || courtCases.length === 0) && res.locals.recallableCourtCases) {
          // Load court cases from res.locals for Cypress tests
          const enhancedCases = res.locals.recallableCourtCases
          courtCases = enhancedCases
            .filter((c: any) => c.status !== 'DRAFT' && c.isSentenced)
            .map((recallableCase: any) => ({
              caseId: recallableCase.courtCaseUuid,
              status: recallableCase.status,
              date: recallableCase.date,
              location: recallableCase.courtCode,
              locationName: recallableCase.courtName,
              reference: recallableCase.reference,
              sentenced: recallableCase.isSentenced,
              sentences: (recallableCase.sentences || []).map((sentence: any) => ({
                ...sentence,
                sentenceUuid: sentence.sentenceUuid,
                offenceDescription: sentence.offenceDescription,
              })),
            }))
          // Save to session for later use
          if (!req.session.formData) {
            req.session.formData = {}
          }
          req.session.formData.courtCaseOptions = courtCases
          req.session.formData.courtCases = courtCases
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        courtCases = courtCases.filter((c: any) => c.status !== 'DRAFT')
        
        const adjustments = getExistingAdjustmentsFromSession(req) || res.locals.adjustments || []
        const existingRecalls = res.locals.recalls || []

        logger.info(`Routing recall with ${courtCases.length} court cases`, { 
          prisonerNumber: prisoner.prisonerNumber,
          courtCasesCount: courtCases.length,
          hasAdjustments: adjustments.length > 0,
          hasExistingRecalls: existingRecalls.length > 0
        })

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
        
        // Debug logging for manual recall test
        logger.info('Revocation date routing decision:', {
          prisonerNumber: prisoner.prisonerNumber,
          hasNonSdsSentences: routingResponse.eligibilityDetails.hasNonSdsSentences,
          manualCaseSelection: routingResponse.eligibilityDetails.hasNonSdsSentences,
          routing: routingResponse.routing,
          eligibleSentenceCount: routingResponse.eligibilityDetails.eligibleSentenceCount,
        })
        
        req.session.formData.routingResponse = routingResponse
        
        // Store additional data that might be needed later
        if (courtCases && courtCases.length > 0) {
          req.session.formData.courtCases = courtCases
        }
        if (adjustments && adjustments.length > 0) {
          req.session.formData.adjustments = adjustments
        }
      } catch (error) {
        logger.error('Routing service validation failed:', error)
        req.session.formData = {
          ...req.session.formData,
          revocationDate: validatedData.revocationDate,
          [sessionModelFields.MANUAL_CASE_SELECTION]: true,
        }
      }

      // Navigate to the rtc-date page
      const nextStep = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
      
      // Ensure session is saved before redirecting
      req.session.save((err) => {
        if (err) {
          logger.error('Error saving session:', err)
          return next(err)
        }
        res.redirect(nextStep)
      })
    } catch (error) {
      logger.error('Error processing revocation date:', error)
      next(error)
    }
  },
)

export default router
