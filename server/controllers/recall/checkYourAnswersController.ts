import { Request, Response } from 'express'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList, calculateUal } from '../../utils/utils'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../../middleware/loadCourtCases'
import { getRecallType } from '../../@types/recallTypes'
import { SessionManager } from '../../services/sessionManager'
import { RecallJourneyData } from '../../services/sessionTypes'

export default class CheckYourAnswersController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = CheckYourAnswersController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if edit recall
    const isEditRecall = !!recallId

    // Get court cases from middleware
    const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    // Build journey data from V2 session
    const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null
    const returnToCustodyDate = sessionData?.returnToCustodyDate ? new Date(sessionData.returnToCustodyDate) : null
    const inPrisonAtRecall = sessionData?.inPrisonAtRecall || false
    const recallTypeCode = sessionData?.recallType
    const recallType = getRecallType(recallTypeCode)

    // Calculate eligible sentences and get sentence IDs from court cases
    let eligibleSentenceCount = 0
    const sentenceIds: string[] = []

    if (recallableCourtCases) {
      recallableCourtCases.forEach(courtCase => {
        courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
          if (sentence.adjustedCRD && sentence.adjustedSLED && revocationDate) {
            const crd = new Date(sentence.adjustedCRD)
            const sled = new Date(sentence.adjustedSLED)

            // Check eligibility based on CRD <= revocationDate <= SLED
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

    // Build journey data object for the summary list
    const journeyData: RecallJourneyData = {
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
      isEdit: isEditRecall,
      storedRecall: sessionData?.storedRecall,
    }

    // Calculate UAL text + diff
    let ualText: string | undefined
    let ualDiff: boolean | undefined

    // Only calculate UAL if person was not in prison at recall (they have a return to custody date)
    const calculatedUal =
      !journeyData.inPrisonAtRecall && journeyData.returnToCustodyDateString
        ? calculateUal(journeyData.revDateString, journeyData.returnToCustodyDateString)
        : null

    if (calculatedUal) {
      ualText = `${calculatedUal.days} day${calculatedUal.days === 1 ? '' : 's'}`
      ualDiff = journeyData.storedRecall?.ual?.days !== calculatedUal.days
    }

    // Build navigation URLs - back to recall type
    const backLink = `/person/${nomisId}/record-recall/recall-type`
    const cancelUrl = `/person/${nomisId}/record-recall/confirm-cancel`

    // Build edit links for V2 flow
    const editLink = (step: string) => `/person/${nomisId}/record-recall/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    // Load form data from session if not from validation
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/v2/check-your-answers', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
      answerSummaryList,
      ualText,
      ualDiff,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = CheckYourAnswersController.getSessionData(req)
    const { nomisId } = res.locals
    const { username, activeCaseload } = res.locals.user

    try {
      // Get court cases from middleware
      const recallableCourtCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

      // Build journey data from V2 session (same as in GET)
      const revocationDate = sessionData?.revocationDate ? new Date(sessionData.revocationDate) : null
      const recallTypeCode = sessionData?.recallType

      // Calculate sentence IDs from eligible sentences
      const sentenceIds: string[] = []

      if (recallableCourtCases && revocationDate) {
        recallableCourtCases.forEach(courtCase => {
          courtCase.sentences?.forEach((sentence: EnhancedRecallableSentence) => {
            if (sentence.adjustedCRD && sentence.adjustedSLED) {
              const crd = new Date(sentence.adjustedCRD)
              const sled = new Date(sentence.adjustedSLED)

              // Check eligibility based on CRD <= revocationDate <= SLED
              if (revocationDate >= crd && revocationDate <= sled) {
                sentenceIds.push(sentence.sentenceUuid)
              }
            }
          })
        })
      }

      // Create the recall object
      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        revocationDate: sessionData?.revocationDate,
        returnToCustodyDate: sessionData?.returnToCustodyDate,
        recallTypeCode,
        createdByUsername: username,
        createdByPrison: activeCaseload.id,
        sentenceIds,
      }

      // Save the recall using the service from req
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { services } = req as any
      const createResponse = await services.recallService.postRecall(recallToSave, username)

      // Handle UAL adjustments using BaseController methods
      const ualToEdit = CheckYourAnswersController.getUalToEdit(req) ?? null
      const ualToCreate = CheckYourAnswersController.getUalToCreate(req) ?? null

      if (ualToCreate !== null) {
        ualToCreate.recallId = createResponse.recallUuid
        await services.adjustmentsService.postUal(ualToCreate, username).catch(() => {
          logger.error('Error while posting UAL to adjustments API')
        })
      }

      if (ualToEdit !== null) {
        ualToEdit.recallId = ualToCreate === null ? createResponse.recallUuid : null
        await services.adjustmentsService.updateUal(ualToEdit, username, ualToEdit.adjustmentId).catch(() => {
          logger.error('Error while updating UAL in adjustments API')
        })
      }

      // Set success flash message
      req.flash('action', 'recorded')

      // Mark journey as complete in session
      await CheckYourAnswersController.updateSessionData(req, {
        journeyComplete: true,
        recallId: createResponse.recallUuid,
      })

      // Clear prisoner-related caches since data has been updated
      SessionManager.clearPrisonerRelatedCache(req, nomisId)
      logger.info(`Cache invalidated after recall creation for prisoner ${nomisId}`)

      // Clear validation and redirect to success
      clearValidation(req)

      // Redirect to the recall-recorded page
      return res.redirect(`/person/${nomisId}/record-recall/recall-recorded`)
    } catch (error) {
      logger.error('Error creating recall:', error)
      throw error
    }
  }
}
