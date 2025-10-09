import { Request, Response } from 'express'
import BaseController from '../../../base/BaseController'
import { clearValidation } from '../../../../middleware/validationMiddleware'
import logger from '../../../../../logger'
import { createAnswerSummaryList, calculateUal } from '../../../../utils/utils'
import { getRecallType, RecallType } from '../../../../@types/recallTypes'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../../../../middleware/loadCourtCases'
import { CreateRecall } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

// Local type for journey data
type V2EditJourneyData = {
  revocationDate?: Date
  revDateString?: string
  inPrisonAtRecall: boolean
  returnToCustodyDate?: Date
  returnToCustodyDateString?: string
  ual?: number
  ualText?: string
  manualCaseSelection: boolean
  recallType: RecallType
  courtCaseCount: number
  eligibleSentenceCount: number
  sentenceIds?: string[]
  isEdit: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storedRecall?: any
}

export default class EditSummaryControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = EditSummaryControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get stored recall from session
    const storedRecall = sessionData?.storedRecall
    if (!storedRecall) {
      // If no stored recall, redirect to populate
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}`)
    }

    // Get prisoner data
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Get court cases from middleware
    const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    // Build journey data from session
    const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null
    const returnToCustodyDate = sessionData?.returnToCustodyDate ? new Date(sessionData.returnToCustodyDate) : null
    const inPrisonAtRecall = sessionData?.inPrisonAtRecall || false
    const recallTypeCode = sessionData?.recallType
    const recallType = getRecallType(recallTypeCode)

    // Calculate eligible sentences
    let eligibleSentenceCount = 0
    const sentenceIds: string[] = []

    if (recallableCourtCases && revocationDate) {
      recallableCourtCases.forEach(courtCase => {
        courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
          if (sentence.adjustedCRD && sentence.adjustedSLED) {
            const crd = new Date(sentence.adjustedCRD)
            const sled = new Date(sentence.adjustedSLED)
            if (revocationDate >= crd && revocationDate <= sled) {
              eligibleSentenceCount += 1
              sentenceIds.push(sentence.sentenceUuid)
            }
          }
        })
      })
    }

    // Get court case count
    const courtCaseCount = sessionData?.manualCaseSelection
      ? sessionData?.selectedCourtCases?.length || 0
      : recallableCourtCases?.length || 0

    // Build journey data for summary
    const journeyData: V2EditJourneyData = {
      revocationDate,
      revDateString: sessionData?.revocationDate,
      inPrisonAtRecall,
      returnToCustodyDate,
      returnToCustodyDateString: sessionData?.returnToCustodyDate,
      ual: sessionData?.UAL,
      ualText: sessionData?.ualText,
      manualCaseSelection: sessionData?.manualCaseSelection || false,
      recallType,
      courtCaseCount,
      eligibleSentenceCount,
      sentenceIds,
      isEdit: true,
      storedRecall,
    }

    // Build edit links - point to individual steps in edit flow
    const editLink = (step: string) => `/person/${nomisId}/edit-recall/${recallId}/${step}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answerSummaryList = createAnswerSummaryList(journeyData as any, editLink)

    // Check if journey is complete (user has visited all necessary steps)
    const journeyComplete = sessionData?.journeyComplete || false

    // Calculate if UAL has changed
    const newUal = calculateUal(sessionData?.revocationDate, sessionData?.returnToCustodyDate)
    const ualDiff = newUal && storedRecall.ual?.days !== newUal.days

    return res.render('pages/recall/v2/edit/edit-summary', {
      prisoner,
      nomisId,
      recallId,
      answerSummaryList,
      ualText: journeyData.ualText,
      ualDiff,
      storedRecall,
      showCheckAnswers: journeyComplete,
      showRecordedOn: !journeyComplete,
      backLink: `/person/${nomisId}`,
      cancelUrl: `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = EditSummaryControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals
    const { username, activeCaseload } = res.locals.user

    try {
      // Get services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { services } = req as any

      // Calculate new UAL
      const newUal = calculateUal(sessionData?.revocationDate, sessionData?.returnToCustodyDate)

      // Handle UAL adjustments first (complex logic from original)
      if (newUal) {
        const existingAdjustments = await services.adjustmentsService.searchUal(nomisId, username, recallId)
        const ualAdjustments = existingAdjustments.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (adj: any) => adj.adjustmentType === 'UNLAWFULLY_AT_LARGE' && adj.unlawfullyAtLarge?.type === 'RECALL',
        )

        const prisoner = res.locals.prisoner || sessionData?.prisoner

        if (ualAdjustments.length) {
          // Handle unexpected multiple UAL adjustments
          if (ualAdjustments.length > 1) {
            logger.warn(
              `Found ${ualAdjustments.length} UAL adjustments for recall ${recallId}. Expected only one. Cleaning up duplicates.`,
            )
            // Delete duplicate UAL adjustments (keep the first one)
            const duplicateAdjustments = ualAdjustments.slice(1)
            await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              duplicateAdjustments.map(async (duplicateUal: any) => {
                await services.adjustmentsService.deleteAdjustment(duplicateUal.id, username)
                logger.info(`Deleted duplicate UAL adjustment ${duplicateUal.id} for recall ${recallId}`)
              }),
            )
          }

          // Update existing UAL
          const existingUal = ualAdjustments[0]
          const ualToUpdate = {
            ...newUal,
            nomisId,
            bookingId: prisoner.bookingId,
            recallId,
            adjustmentId: existingUal.id,
          }
          await services.adjustmentsService.updateUal(ualToUpdate, username, existingUal.id)
          logger.info(
            `Updated existing UAL adjustment ${existingUal.id} for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        } else {
          // Create new UAL
          const ualToCreate = {
            ...newUal,
            nomisId,
            bookingId: prisoner.bookingId,
            recallId,
          }
          await services.adjustmentsService.postUal(ualToCreate, username)
          logger.info(
            `Created new UAL adjustment for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        }
      } else {
        logger.info(
          `No UAL period needed for recall ${recallId} - revocation date and return to custody date are too close`,
        )
      }

      // Get court cases and calculate sentence IDs
      const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]
      const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null
      const sentenceIds: string[] = []

      if (recallableCourtCases && revocationDate) {
        recallableCourtCases.forEach(courtCase => {
          courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
            if (sentence.adjustedCRD && sentence.adjustedSLED) {
              const crd = new Date(sentence.adjustedCRD)
              const sled = new Date(sentence.adjustedSLED)
              if (revocationDate >= crd && revocationDate <= sled) {
                sentenceIds.push(sentence.sentenceUuid)
              }
            }
          })
        })
      }

      // Use stored recall's sentence IDs if not calculated (for manual selection cases)
      const finalSentenceIds = sentenceIds.length > 0 ? sentenceIds : sessionData?.storedRecall?.sentenceIds

      // Update the recall
      const recallToUpdate: CreateRecall = {
        prisonerId: nomisId,
        revocationDate: sessionData?.revocationDate,
        returnToCustodyDate: sessionData?.returnToCustodyDate,
        recallTypeCode: sessionData?.recallType,
        createdByUsername: username,
        createdByPrison: activeCaseload.id,
        sentenceIds: finalSentenceIds,
      }

      await services.recallService.updateRecall(recallId, recallToUpdate, username)

      // Set success flash message
      req.flash('action', 'updated')

      // Clear edit session data
      EditSummaryControllerV2.updateSessionData(req, {
        isEdit: false,
        storedRecall: null,
        journeyComplete: null,
      })

      // Clear validation and redirect to success
      clearValidation(req)
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}/recall-updated`)
    } catch (error) {
      logger.error('Error updating recall:', error)
      throw error
    }
  }
}
