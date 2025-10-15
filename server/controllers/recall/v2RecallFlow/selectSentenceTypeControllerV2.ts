import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import dayjs from 'dayjs'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'
import {
  RecallableCourtCaseSentence,
  SentenceType,
} from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { findSentenceAndCourtCase } from '../../../helpers/sentenceHelper'
import { formatDateStringToDDMMYYYY } from '../../../utils/utils'

export default class SelectSentenceTypeControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = SelectSentenceTypeControllerV2.getSessionData(req)
    const { nomisId } = res.locals
    const { sentenceUuid } = req.params
    const recallId = res.locals.recallId || null

    // Get prisoner data
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if edit recall
    const isEditRecall = !!recallId

    // Get court cases from session (look for selectedCases first, then fall back to courtCaseOptions)
    const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]

    // Find the target sentence and court case
    const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

    if (!targetSentence || !targetCourtCase) {
      logger.error(`Sentence not found: ${sentenceUuid}`)
      const redirectUrl = `/person/${nomisId}/record-recall-v2/update-sentence-types-summary`
      return res.redirect(redirectUrl)
    }

    // Get applicable sentence types from API
    const sentenceTypes = await SelectSentenceTypeControllerV2.getApplicableSentenceTypes(
      req,
      res,
      targetSentence,
      targetCourtCase,
    )

    // Check if already updated
    const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
      string,
      { uuid: string; description: string }
    >
    const selectedType = updatedSentences[sentenceUuid]?.uuid

    // Check if we're in iterative flow
    const bulkUpdateMode = sessionData?.bulkUpdateMode
    const currentSentenceIndex = sessionData?.currentSentenceIndex
    const sentencesInCurrentCase = sessionData?.sentencesInCurrentCase as
      | Array<{
          sentenceUuid: string
          isUnknownSentenceType: boolean
        }>
      | undefined

    // Determine navigation
    let backLink = `/person/${nomisId}/record-recall-v2/update-sentence-types-summary`
    if (bulkUpdateMode === false && typeof currentSentenceIndex === 'number' && currentSentenceIndex > 0) {
      // In iterative flow and not the first sentence
      const previousSentenceUuid = sentencesInCurrentCase?.[currentSentenceIndex - 1]?.sentenceUuid
      if (previousSentenceUuid) {
        backLink = `/person/${nomisId}/record-recall-v2/select-sentence-type/${previousSentenceUuid}`
      }
    }

    const cancelUrl = `/person/${nomisId}/record-recall-v2/confirm-cancel`

    // Store return URL for cancel flow
    await SelectSentenceTypeControllerV2.updateSessionData(req, {
      returnTo: req.originalUrl,
    })

    // Load form data from session if not from validation
    if (!res.locals.formResponses) {
      res.locals.formResponses = {
        sentenceType: selectedType,
      }
    }

    // Format sentence details for display
    const formattedSentence = {
      ...targetSentence,
      offenceStartDate: targetSentence.offenceStartDate
        ? formatDateStringToDDMMYYYY(targetSentence.offenceStartDate)
        : null,
      offenceEndDate: targetSentence.offenceEndDate ? formatDateStringToDDMMYYYY(targetSentence.offenceEndDate) : null,
      convictionDate: targetSentence.convictionDate ? formatDateStringToDDMMYYYY(targetSentence.convictionDate) : null,
    }

    // Format court case details for display
    const formattedCourtCase = {
      ...targetCourtCase,
      date: targetCourtCase.date ? formatDateStringToDDMMYYYY(targetCourtCase.date) : null,
      courtName: targetCourtCase.locationName || 'Court name not available',
    }

    return res.render('pages/recall/v2/select-sentence-type', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      sentence: formattedSentence,
      courtCase: formattedCourtCase,
      sentenceUuid,
      sentenceTypes,
      selectedType,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
      pageHeading: 'Record a recall',
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = SelectSentenceTypeControllerV2.getSessionData(req)
    const { nomisId } = res.locals
    const { sentenceUuid } = req.params
    const { sentenceType } = req.body

    // Get court cases from session
    const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]

    // Get sentence type description
    const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

    if (!targetSentence || !targetCourtCase) {
      logger.error(`Sentence not found during POST: ${sentenceUuid}`)
      clearValidation(req)
      return res.redirect(`/person/${nomisId}/record-recall-v2/update-sentence-types-summary`)
    }

    // Get the sentence types again to find the description
    const sentenceTypes = await SelectSentenceTypeControllerV2.getApplicableSentenceTypes(
      req,
      res,
      targetSentence,
      targetCourtCase,
    )
    const selectedTypeDesc = sentenceTypes.find(t => t.sentenceTypeUuid === sentenceType)?.description

    // Update session with selected sentence type
    const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
      string,
      { uuid: string; description: string }
    >
    updatedSentences[sentenceUuid] = {
      uuid: sentenceType,
      description: selectedTypeDesc || sentenceType,
    }

    await SelectSentenceTypeControllerV2.updateSessionData(req, {
      updatedSentenceTypes: updatedSentences,
    })

    // Check if we're in individual flow (not bulk)
    const bulkUpdateMode = sessionData?.bulkUpdateMode
    if (bulkUpdateMode === false) {
      // We're in individual update mode
      const sentencesInCase = sessionData?.sentencesInCurrentCase as
        | Array<{
            sentenceUuid: string
            isUnknownSentenceType: boolean
          }>
        | undefined
      const currentIndex = sessionData?.currentSentenceIndex as number | undefined

      if (sentencesInCase && typeof currentIndex === 'number') {
        // Move to the next sentence
        const nextIndex = currentIndex + 1
        await SelectSentenceTypeControllerV2.updateSessionData(req, {
          currentSentenceIndex: nextIndex,
        })

        if (nextIndex < sentencesInCase.length) {
          // There are more sentences to update
          const nextSentenceUuid = sentencesInCase[nextIndex].sentenceUuid
          logger.info('Moving to next sentence in individual update flow', {
            currentIndex: nextIndex,
            totalSentences: sentencesInCase.length,
            nextSentenceUuid,
          })
          clearValidation(req)
          return res.redirect(`/person/${nomisId}/record-recall-v2/select-sentence-type/${nextSentenceUuid}`)
        }

        // This was the last sentence, clean up session state
        logger.info('Completed individual sentence update flow', {
          totalSentences: sentencesInCase.length,
        })
        await SelectSentenceTypeControllerV2.updateSessionData(req, {
          bulkUpdateMode: null,
          sentencesInCurrentCase: null,
          currentSentenceIndex: null,
        })
      }
    }

    // Default behavior: navigate back to summary page after updating
    clearValidation(req)
    return res.redirect(`/person/${nomisId}/record-recall-v2/update-sentence-types-summary`)
  }

  static async getApplicableSentenceTypes(
    req: Request,
    res: Response,
    sentence: RecallableCourtCaseSentence,
    courtCase: CourtCase,
  ): Promise<SentenceType[]> {
    try {
      const sessionData = SelectSentenceTypeControllerV2.getSessionData(req)
      const prisoner = res.locals.prisoner || sessionData?.prisoner

      if (!prisoner?.dateOfBirth) {
        throw new Error('Prisoner date of birth not found')
      }

      const dateOfBirth = dayjs(prisoner.dateOfBirth)
      if (!dateOfBirth.isValid()) {
        throw new Error(`Invalid prisoner dateOfBirth: ${prisoner.dateOfBirth}`)
      }

      let convictionDate
      let ageAtConviction
      if (sentence.convictionDate) {
        const dateOfConviction = dayjs(sentence.convictionDate)
        ageAtConviction = dateOfConviction.diff(dateOfBirth, 'year')
        convictionDate = dateOfConviction.format('YYYY-MM-DD')
      } else {
        // Fallback to use today's date if there is no convictionDate
        convictionDate = dayjs().format('YYYY-MM-DD')
        ageAtConviction = dayjs().diff(dayjs(dateOfBirth), 'year')
      }

      const offenceDate = sentence.offenceStartDate
        ? dayjs(sentence.offenceStartDate).format('YYYY-MM-DD')
        : dayjs(courtCase.date).format('YYYY-MM-DD')

      return await req.services.courtCaseService.searchSentenceTypes(
        {
          age: ageAtConviction,
          convictionDate,
          offenceDate,
          statuses: ['ACTIVE'] as ('ACTIVE' | 'INACTIVE')[],
        },
        res.locals.user.username,
      )
    } catch (error) {
      logger.error('Failed to fetch applicable sentence types', { error: error.message })
      throw error
    }
  }
}
