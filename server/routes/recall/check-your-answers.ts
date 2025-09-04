import { Router, Request, Response, NextFunction } from 'express'
import { checkAnswersSchema } from '../../schemas/recall/check-answers.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { getRecallType } from '../../@types/recallTypes'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import { formatDateStringToDDMMYYYY } from '../../utils/utils'
import logger from '../../../logger'

const router = Router()

router.get('/check-your-answers', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const isEditRecall = res.locals.isEditRecall || false
  const { recallId } = res.locals
  const formData = req.session.formData || {}

  // Prepare summary data
  const recallType = formData.recallType ? getRecallType(formData.recallType as string) : null
  const summaryData = {
    revocationDate: formData.revocationDate ? formatDateStringToDDMMYYYY(formData.revocationDate as string) : '',
    returnToCustodyDate: formData.returnToCustodyDate
      ? formatDateStringToDDMMYYYY(formData.returnToCustodyDate as string)
      : '',
    recallType: recallType?.description || formData.recallType || '',
    courtCases: formData.courtCaseIds || [],
    sentences: formData.sentenceIds || [],
  }

  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/select-court-case`

  res.render('pages/recall/check-your-answers', {
    summaryData,
    values: formData,
    errors: req.session.formErrors || {},
    backLink,
    prisoner,
    isEditRecall,
    recallId,
  })

  delete req.session.formErrors
})

router.post(
  '/check-your-answers',
  validateWithZod(checkAnswersSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prisoner } = res.locals
      const { user } = res.locals
      const formData = req.session.formData || {}

      // Prepare recall data for submission
      const recallData = {
        nomisId: prisoner.prisonerNumber,
        revocationDate: formData.revocationDate,
        returnToCustodyDate: formData.returnToCustodyDate,
        recallType: formData.recallType,
        courtCaseIds: formData.courtCaseIds || [],
        sentenceIds: formData.sentenceIds || [],
        createdBy: user.username,
      }

      // Save recall via service
      const recallService = req.services?.recallService
      if (!recallService) {
        throw new Error('Recall service not available')
      }

      try {
        // For now, just save to session until createRecall is implemented
        ;(req.session as any).savedRecall = recallData

        // Clear recall session data
        delete req.session.formData
        delete req.session.journeyHistory
        delete req.session.formErrors
        // Clear other session fields if they exist
        if (sessionModelFields.COURT_CASE_OPTIONS in req.session) {
          delete (req.session as any)[sessionModelFields.COURT_CASE_OPTIONS]
        }
        if (sessionModelFields.RAS_SENTENCES in req.session) {
          delete (req.session as any)[sessionModelFields.RAS_SENTENCES]
        }
        if ('adjustments' in req.session) {
          delete req.session.adjustments
        }

        // Redirect to complete page
        res.redirect(`/person/${prisoner.prisonerNumber}/record-recall/complete`)
      } catch (saveError) {
        logger.error('Error saving recall:', saveError)
        req.session.formErrors = {
          general: {
            type: 'error',
            message: 'There was an error saving the recall. Please try again.',
          },
        }
        res.redirect(req.originalUrl)
      }
    } catch (error) {
      logger.error('Error processing check your answers:', error)
      next(error)
    }
  },
)

export default router
