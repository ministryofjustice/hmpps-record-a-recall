import { NextFunction, Response } from 'express'
import { ExtendedRequest } from '../base/ExpressBaseController'

import RecallBaseController from './recallBaseController'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/recallSessionHelper'
import { getSessionValue, setSessionValue, unsetSessionValue } from '../../helpers/sessionHelper'
import logger from '../../../logger'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import { findSentenceAndCourtCase, getApplicableSentenceTypes } from '../../helpers/sentenceHelper'

export default class SelectSentenceTypeController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(loadCourtCaseOptions)
    this.use(this.setSentenceTypeFieldItems)
  }

  async setSentenceTypeFieldItems(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sentenceUuid } = req.params
      const courtCases = getCourtCaseOptions(req)

      const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        return next(new Error(`Sentence not found: ${sentenceUuid}`))
      }

      const { user } = res.locals
      const sentenceTypes = await getApplicableSentenceTypes(req, targetSentence, targetCourtCase, user.username)

      req.form.options.fields.sentenceType.items = sentenceTypes.map(type => ({
        value: type.sentenceTypeUuid,
        text: type.description,
      }))

      return next()
    } catch (error) {
      logger.error('Error setting sentence type field items', { error: error.message })
      return next(error)
    }
  }

  async get(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sentenceUuid } = req.params
      const courtCases = getCourtCaseOptions(req)

      const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        throw new Error(`Sentence not found: ${sentenceUuid}`)
      }

      // Check if sentence has already been updated
      const updatedSentences = (getSessionValue(req, sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
        string,
        { uuid: string; description: string }
      >
      const selectedType = updatedSentences[sentenceUuid]?.uuid

      const sentenceTypes = req.form.options.fields.sentenceType.items.map((item: { value: string; text: string }) => ({
        sentenceTypeUuid: item.value,
        description: item.text,
      }))

      res.locals.sentence = targetSentence
      res.locals.courtCase = targetCourtCase
      res.locals.selectedType = selectedType
      res.locals.sentenceTypes = sentenceTypes
      res.locals.sentenceUuid = sentenceUuid

      super.get(req, res, next)
    } catch (error) {
      logger.error('Error in SelectSentenceTypeController.get', { error: error.message })
      next(error)
    }
  }

  async post(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    const { sentenceUuid } = req.params
    const selectedTypeUuid = req.body.sentenceType

    // Find the description for the selected type
    const sentenceTypeItem = req.form.options.fields.sentenceType.items.find(
      (item: { value: string; text: string }) => item.value === selectedTypeUuid,
    )
    const selectedTypeDescription = sentenceTypeItem ? sentenceTypeItem.text : selectedTypeUuid

    const updatedSentences = (getSessionValue(req, sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
      string,
      { uuid: string; description: string }
    >
    updatedSentences[sentenceUuid] = {
      uuid: selectedTypeUuid,
      description: selectedTypeDescription,
    }
    setSessionValue(req, sessionModelFields.UPDATED_SENTENCE_TYPES, updatedSentences)

    // Check if we're in individual update mode (not bulk)
    const bulkUpdateMode = getSessionValue(req, sessionModelFields.BULK_UPDATE_MODE)

    if (bulkUpdateMode === false) {
      // We're in individual update mode
      const sentencesInCurrentCase = getSessionValue(req, sessionModelFields.SENTENCES_IN_CURRENT_CASE) as
        | Array<{
            sentenceUuid: string
            isUnknownSentenceType: boolean
          }>
        | undefined
      let currentSentenceIndex = getSessionValue(req, sessionModelFields.CURRENT_SENTENCE_INDEX) as number | undefined

      if (sentencesInCurrentCase && typeof currentSentenceIndex === 'number') {
        // Move to the next sentence
        currentSentenceIndex += 1
        setSessionValue(req, sessionModelFields.CURRENT_SENTENCE_INDEX, currentSentenceIndex)

        if (currentSentenceIndex < sentencesInCurrentCase.length) {
          // There are more sentences to update
          const nextSentenceUuid = sentencesInCurrentCase[currentSentenceIndex].sentenceUuid
          logger.info('Moving to next sentence in individual update flow', {
            currentIndex: currentSentenceIndex,
            totalSentences: sentencesInCurrentCase.length,
            nextSentenceUuid,
          })
          return res.redirect(`/person/${res.locals.nomisId}/record-recall/select-sentence-type/${nextSentenceUuid}`)
        }

        // This was the last sentence, clean up session state
        logger.info('Completed individual sentence update flow', {
          totalSentences: sentencesInCurrentCase.length,
        })
        unsetSessionValue(req, sessionModelFields.BULK_UPDATE_MODE)
        unsetSessionValue(req, sessionModelFields.SENTENCES_IN_CURRENT_CASE)
        unsetSessionValue(req, sessionModelFields.CURRENT_SENTENCE_INDEX)
      }
    }

    // Default behavior: navigate back to summary page after updating
    return super.post(req, res, next)
  }

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
      pageTitle: 'Select the sentence type',
    }
  }
}
