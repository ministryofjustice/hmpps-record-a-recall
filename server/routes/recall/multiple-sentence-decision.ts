import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { CourtCase } from 'models'
import { validateWithZod } from '../../middleware/validation-middleware'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import { RecallableCourtCaseSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const router = Router()

// Schema for the form
const sameSentenceTypeSchema = z.object({
  sameSentenceType: z.enum(['yes', 'no'] as const).describe('Whether all sentences should have the same type'),
})

router.get(
  '/multiple-sentence-decision/:courtCaseId',
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courtCaseId } = req.params
      const courtCases = getCourtCaseOptions(
        req as Request & { sessionModel?: unknown; session?: { formData?: Record<string, unknown> } },
      ) as CourtCase[]
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        logger.error(`Court case not found: ${courtCaseId}`)
        throw new Error(`Court case not found: ${courtCaseId}`)
      }

      // Filter for sentences with unknown pre-recall sentence type
      const unknownSentences =
        targetCase.sentences
          ?.filter((s: RecallableCourtCaseSentence) => s.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL)
          .map((s: RecallableCourtCaseSentence) => ({
            sentenceUuid: s.sentenceUuid,
            isUnknownSentenceType: true,
          })) || []

      if (unknownSentences.length === 0) {
        logger.warn('No unknown sentences found for court case', { courtCaseId })
        return res.redirect(`/person/${res.locals.prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`)
      }

      // Store sentences in session for later use
      req.session.formData = {
        ...req.session.formData,
        [sessionModelFields.SENTENCES_IN_CURRENT_CASE]: unknownSentences,
        [sessionModelFields.SELECTED_COURT_CASE_UUID]: courtCaseId,
      }

      const { prisoner } = res.locals
      const backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`

      res.render('pages/recall/base-question', {
        fields: {
          sameSentenceType: {
            component: 'govukRadios',
            id: 'sameSentenceType',
            name: 'sameSentenceType',
            fieldset: {
              legend: {
                text: 'Is the sentence type the same for all sentences in this court case?',
                classes: 'govuk-fieldset__legend--l',
              },
            },
            items: [
              { text: 'Yes', value: 'yes' },
              { text: 'No', value: 'no' },
            ],
          },
        },
        values: req.session.formData || {},
        errors: req.session.formErrors || {},
        backLink,
        prisoner,
        sentenceCount: unknownSentences.length,
        courtCase: targetCase,
        courtCaseId,
      })

      delete req.session.formErrors
      return undefined
    } catch (error) {
      logger.error('Error in multiple sentence decision GET', { error: error.message })
      return next(error)
    }
  },
)

router.post(
  '/multiple-sentence-decision/:courtCaseId',
  validateWithZod(sameSentenceTypeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courtCaseId } = req.params
      const validatedData = req.validatedData as { sameSentenceType: 'yes' | 'no' }
      const sameSentenceType = validatedData.sameSentenceType === 'yes'

      // Set bulk update mode flag
      req.session.formData = {
        ...req.session.formData,
        [sessionModelFields.BULK_UPDATE_MODE]: sameSentenceType,
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      const currentPath = req.path.replace(`/${courtCaseId}`, '')
      if (!req.session.journeyHistory.includes(currentPath)) {
        req.session.journeyHistory.push(currentPath)
      }

      if (sameSentenceType) {
        // For bulk flow, navigate to bulk sentence type page
        res.redirect(`/person/${res.locals.prisoner.prisonerNumber}/record-recall/bulk-sentence-type/${courtCaseId}`)
      } else {
        // For individual flow, initialize the sentence index
        req.session.formData[sessionModelFields.CURRENT_SENTENCE_INDEX] = 0

        // Get the first sentence to determine next URL
        const sentencesInCase = req.session.formData[sessionModelFields.SENTENCES_IN_CURRENT_CASE] as Array<{
          sentenceUuid: string
          isUnknownSentenceType: boolean
        }>

        if (sentencesInCase && sentencesInCase.length > 0) {
          // Navigate to the first individual sentence type selection
          res.redirect(
            `/person/${res.locals.prisoner.prisonerNumber}/record-recall/select-sentence-type/${sentencesInCase[0].sentenceUuid}`,
          )
        } else {
          // Fallback to summary if no sentences
          res.redirect(`/person/${res.locals.prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`)
        }
      }
    } catch (error) {
      logger.error('Error in multiple sentence decision POST', { error: error.message })
      next(error)
    }
  },
)

export default router
