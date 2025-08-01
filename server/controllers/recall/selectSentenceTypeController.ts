import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import type { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import { RecallableCourtCaseSentence, SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'

export default class SelectSentenceTypeController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(loadCourtCaseOptions)
    this.use(this.setSentenceTypeFieldItems)
  }

  private findSentenceAndCourtCase(sentenceUuid: string, courtCases: CourtCase[]) {
    for (const courtCase of courtCases) {
      const sentence = courtCase.sentences?.find(s => s.sentenceUuid === sentenceUuid)
      if (sentence) {
        return { targetSentence: sentence, targetCourtCase: courtCase }
      }
    }
    return { targetSentence: null, targetCourtCase: null }
  }

  private async getApplicableSentenceTypes(
    req: FormWizard.Request,
    sentence: RecallableCourtCaseSentence,
    courtCase: CourtCase,
    username: string,
  ): Promise<SentenceType[]> {
    try {
      // Calculate age at conviction from prisoner details
      const prisoner = req.sessionModel.get('prisoner') as { dateOfBirth: string }
      const convictionDate = new Date(courtCase.date)
      const dateOfBirth = new Date(prisoner.dateOfBirth)
      const ageAtConviction = Math.floor(
        (convictionDate.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )

      return await req.services.courtCaseService.searchSentenceTypes(
        {
          age: ageAtConviction,
          convictionDate: courtCase.date,
          offenceDate: sentence.offenceStartDate || courtCase.date,
          statuses: ['ACTIVE'],
        },
        username,
      )
    } catch (error) {
      logger.error('Failed to fetch applicable sentence types', { error: error.message })
      throw error
    }
  }

  async setSentenceTypeFieldItems(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sentenceUuid } = req.params
      const courtCases = getCourtCaseOptions(req)

      const { targetSentence, targetCourtCase } = this.findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        return next(new Error(`Sentence not found: ${sentenceUuid}`))
      }

      const { user } = res.locals
      const sentenceTypes = await this.getApplicableSentenceTypes(req, targetSentence, targetCourtCase, user.username)

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

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sentenceUuid } = req.params
      const courtCases = getCourtCaseOptions(req)

      const { targetSentence, targetCourtCase } = this.findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        throw new Error(`Sentence not found: ${sentenceUuid}`)
      }

      // Check if sentence has already been updated
      const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
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

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { sentenceUuid } = req.params
    const selectedTypeUuid = req.body.sentenceType

    // Find the description for the selected type
    const sentenceTypeItem = req.form.options.fields.sentenceType.items.find(
      (item: { value: string; text: string }) => item.value === selectedTypeUuid,
    )
    const selectedTypeDescription = sentenceTypeItem ? sentenceTypeItem.text : selectedTypeUuid

    const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
      string,
      { uuid: string; description: string }
    >
    updatedSentences[sentenceUuid] = {
      uuid: selectedTypeUuid,
      description: selectedTypeDescription,
    }
    req.sessionModel.set(sessionModelFields.UPDATED_SENTENCE_TYPES, updatedSentences)

    // Check if we're in individual update mode (not bulk)
    const bulkUpdateMode = req.sessionModel.get(sessionModelFields.BULK_UPDATE_MODE)
    const sentencesInCurrentCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as
      | string[]
      | undefined
    const currentSentenceIndex = req.sessionModel.get(sessionModelFields.CURRENT_SENTENCE_INDEX) as number | undefined

    if (bulkUpdateMode === false && sentencesInCurrentCase && typeof currentSentenceIndex === 'number') {
      // TODO: RCLL-453 - Implement sequential sentence update flow
      // For now, redirect to check sentences page when all sentences for this case are done
      logger.info('Sequential sentence update flow not yet implemented, redirecting to check sentences')
      return res.redirect(`/person/${res.locals.nomisId}/record-recall/check-sentences`)
    }

    // Default behavior: navigate back to summary page after updating
    return super.post(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
      pageTitle: 'Select the sentence type',
    }
  }
}
