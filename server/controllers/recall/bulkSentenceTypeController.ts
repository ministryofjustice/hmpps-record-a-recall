import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import type { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { findSentenceAndCourtCase, getApplicableSentenceTypes } from '../../helpers/sentenceHelper'

export default class BulkSentenceTypeController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(loadCourtCaseOptions)
    this.use(this.setSentenceTypeFieldItems)
  }

  private async getCommonApplicableSentenceTypes(
    req: FormWizard.Request,
    sentencesInCase: Array<{ sentenceUuid: string; isUnknownSentenceType: boolean }>,
    courtCases: CourtCase[],
    targetCase: CourtCase,
    username: string,
  ): Promise<SentenceType[]> {
    try {
      // Get applicable types for each sentence
      const allApplicableTypesPromises = sentencesInCase.map(async ({ sentenceUuid }) => {
        const { targetSentence } = findSentenceAndCourtCase(sentenceUuid, courtCases)
        if (!targetSentence) {
          throw new Error(`Sentence not found: ${sentenceUuid}`)
        }
        return getApplicableSentenceTypes(req, targetSentence, targetCase, username)
      })

      const allApplicableTypes = await Promise.all(allApplicableTypesPromises)

      // Find the intersection of all returned types (types that are common to all sentences)
      if (allApplicableTypes.length === 0) {
        return []
      }

      const commonTypes = allApplicableTypes.reduce((intersection, currentTypes) => {
        return intersection.filter(intersectionType =>
          currentTypes.some(currentType => currentType.sentenceTypeUuid === intersectionType.sentenceTypeUuid),
        )
      })

      logger.info('Found common applicable sentence types', {
        totalSentences: sentencesInCase.length,
        commonTypesCount: commonTypes.length,
      })

      return commonTypes
    } catch (error) {
      logger.error('Failed to fetch common applicable sentence types', { error: error.message })
      throw error
    }
  }

  async setSentenceTypeFieldItems(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courtCaseId } = req.params
      const courtCases = getCourtCaseOptions(req)
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        return next(new Error(`Court case not found: ${courtCaseId}`))
      }

      const sentencesInCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        return next(new Error('No sentences found in session'))
      }

      const { user } = res.locals
      const sentenceTypes = await this.getCommonApplicableSentenceTypes(
        req,
        sentencesInCase,
        courtCases,
        targetCase,
        user.username,
      )

      req.form.options.fields.sentenceType.items = sentenceTypes.map(type => ({
        value: type.sentenceTypeUuid,
        text: type.description,
      }))

      // Store court case and sentence count for template
      res.locals.courtCase = targetCase
      res.locals.sentenceCount = sentencesInCase.length

      return next()
    } catch (error) {
      logger.error('Error setting sentence type field items', { error: error.message })
      return next(error)
    }
  }

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courtCaseId } = req.params
      res.locals.courtCaseId = courtCaseId

      // Get sentences from session
      const sentencesInCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        logger.error('No sentences in current case found in session')
        return res.redirect(`/person/${res.locals.nomisId}/record-recall/update-sentence-types-summary`)
      }

      const sentenceTypes = req.form.options.fields.sentenceType.items.map((item: { value: string; text: string }) => ({
        sentenceTypeUuid: item.value,
        description: item.text,
      }))

      res.locals.sentenceTypes = sentenceTypes

      return super.get(req, res, next)
    } catch (error) {
      logger.error('Error in BulkSentenceTypeController.get', { error: error.message })
      return next(error)
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const selectedTypeUuid = req.body.sentenceType
      const { courtCaseId } = req.params

      // Find the description for the selected type
      const sentenceTypeItem = req.form.options.fields.sentenceType.items.find(
        (item: { value: string; text: string }) => item.value === selectedTypeUuid,
      )
      const selectedTypeDescription = sentenceTypeItem ? sentenceTypeItem.text : selectedTypeUuid

      // Get all sentences for this court case from session
      const sentencesInCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        return next(new Error('No sentences found in session'))
      }

      // Get existing updated sentences or initialize empty object
      const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
        string,
        { uuid: string; description: string }
      >

      // Apply the selected type to all sentences in the court case
      sentencesInCase.forEach(({ sentenceUuid }) => {
        updatedSentences[sentenceUuid] = {
          uuid: selectedTypeUuid,
          description: selectedTypeDescription,
        }
      })

      // Update session with all sentence type mappings
      req.sessionModel.set(sessionModelFields.UPDATED_SENTENCE_TYPES, updatedSentences)

      // Clear bulk update mode and related session data
      req.sessionModel.unset(sessionModelFields.BULK_UPDATE_MODE)
      req.sessionModel.unset(sessionModelFields.SENTENCES_IN_CURRENT_CASE)
      req.sessionModel.unset(sessionModelFields.CURRENT_SENTENCE_INDEX)

      logger.info('Bulk sentence type update completed', {
        courtCaseId,
        sentenceCount: sentencesInCase.length,
        selectedType: selectedTypeDescription,
      })

      // Navigate back to update-sentence-types-summary
      return res.redirect(`/person/${res.locals.nomisId}/record-recall/update-sentence-types-summary`)
    } catch (error) {
      logger.error('Error in BulkSentenceTypeController.post', { error: error.message })
      return next(error)
    }
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
      pageTitle: 'Select sentence type for all sentences',
    }
  }
}
