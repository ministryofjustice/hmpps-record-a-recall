import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validateWithZod } from '../../../middleware/validation-middleware'
import logger from '../../../../logger'
import { createAnswerSummaryList, calculateUal } from '../../../utils/utils'
import getJourneyDataFromRequest, {
  RecallJourneyData,
  sessionModelFields,
  getPrisoner,
} from '../../../helpers/formWizardHelper'
import { CreateRecall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const router = Router()

// Schema for the edit summary confirmation
const editSummarySchema = z.object({})

router.get('/edit-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recallId, nomisId } = res.locals
    const reqWithSession = req as Request & { sessionModel?: unknown; session?: { formData?: Record<string, unknown> } }

    // Set edit flag
    req.session.formData = {
      ...req.session.formData,
      [sessionModelFields.IS_EDIT]: true,
    }

    const journeyData: RecallJourneyData = getJourneyDataFromRequest(reqWithSession)
    const editLink = (step: string) => `/person/${nomisId}/edit-recall/${recallId}/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    const { prisoner } = res.locals
    const backLink = `/person/${prisoner.prisonerNumber}/recall/${recallId}`

    res.render('pages/recall/edit/edit-summary', {
      values: req.session.formData || {},
      errors: req.session.formErrors || {},
      backLink,
      prisoner,
      recallId,
      nomisId,
      answerSummaryList,
      ualText: journeyData.ualText,
      ualDiff: journeyData.ual && journeyData.storedRecall?.ual?.days !== journeyData.ual,
      storedRecall: journeyData.storedRecall,
    })

    delete req.session.formErrors
  } catch (error) {
    logger.error('Error in edit summary GET', { error: error.message })
    next(error)
  }
})

router.post(
  '/edit-summary',
  validateWithZod(editSummarySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recallId, nomisId } = res.locals
      const { username, activeCaseload } = res.locals.user
      const reqWithSession = req as Request & {
        sessionModel?: unknown
        session?: { formData?: Record<string, unknown> }
      }
      const { services } = reqWithSession

      if (!services) {
        throw new Error('Services not configured')
      }

      const journeyData: RecallJourneyData = getJourneyDataFromRequest(reqWithSession)

      // Calculate the new UAL with current form data first
      const newUal = calculateUal(journeyData.revDateString, journeyData.returnToCustodyDateString)

      // Handle UAL adjustments before updating the recall
      if (newUal) {
        // Find existing UAL adjustments for this recall
        const existingAdjustments = await services.adjustmentsService.searchUal(nomisId, username, recallId)
        const ualAdjustments = existingAdjustments.filter(
          (adj: any) =>
            adj.adjustmentType === 'UNLAWFULLY_AT_LARGE' && adj.unlawfullyAtLarge?.type === 'RECALL',
        )

        const prisonerDetails = getPrisoner(reqWithSession)

        if (ualAdjustments.length) {
          // Handle unexpected multiple UAL adjustments
          if (ualAdjustments.length > 1) {
            logger.warn(
              `Found ${ualAdjustments.length} UAL adjustments for recall ${recallId}. Expected only one. Cleaning up duplicates.`,
            )

            // Delete duplicate UAL adjustments
            const duplicateAdjustments = ualAdjustments.slice(1)
            await Promise.all(
              duplicateAdjustments.map(async (duplicateUal) => {
                if (duplicateUal.id) {
                  await services.adjustmentsService.deleteAdjustment(duplicateUal.id, username)
                  logger.info(`Deleted duplicate UAL adjustment ${duplicateUal.id} for recall ${recallId}`)
                }
              }),
            )
          }

          // Update existing UAL adjustment
          const existingUal = ualAdjustments[0]
          const ualToUpdate = {
            ...newUal,
            nomisId,
            bookingId: prisonerDetails.bookingId,
            recallId,
            adjustmentId: existingUal.id,
          }

          await services.adjustmentsService.updateUal(ualToUpdate, username, existingUal.id)
          logger.info(
            `Updated existing UAL adjustment ${existingUal.id} for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        } else {
          // Create new UAL adjustment if none exists
          const ualToCreate = {
            ...newUal,
            nomisId,
            bookingId: prisonerDetails.bookingId,
            recallId,
          }

          await services.adjustmentsService.postUal(ualToCreate, username)
          logger.info(
            `Created new UAL adjustment for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        }
      }

      // Update the recall with journey data
      const recallUpdate = {
        prisonerId: nomisId,
        revocationDate: journeyData.revDateString,
        recallTypeCode: journeyData.recallType as any,
        returnToCustodyDate: journeyData.returnToCustodyDateString,
        createdByUsername: username,
        createdByPrison: activeCaseload,
        sentenceIds: journeyData.sentenceIds || [],
      }

      await services.recallService.updateRecall(recallUpdate as any, nomisId, username)
      logger.info(`Updated recall ${recallId} successfully`)

      // Clear session data after successful save
      delete req.session.formData[sessionModelFields.IS_EDIT]

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (!req.session.journeyHistory.includes('/edit-summary')) {
        req.session.journeyHistory.push('/edit-summary')
      }

      // Redirect to recall details page
      res.redirect(`/person/${nomisId}/recall/${recallId}`)
    } catch (error) {
      logger.error('Error processing edit summary', { error })
      next(error)
    }
  },
)

export default router
