import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import type { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { RecallableCourtCaseSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class MultipleSentenceDecisionController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setSentencesInCase)
  }

  async setSentencesInCase(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courtCaseId } = req.params
      const courtCases = getCourtCaseOptions(req) as CourtCase[]
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        logger.error(`Court case not found: ${courtCaseId}`)
        return next(new Error(`Court case not found: ${courtCaseId}`))
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
        return res.redirect(`/person/${res.locals.nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Store sentences in session for later use
      req.sessionModel.set(sessionModelFields.SENTENCES_IN_CURRENT_CASE, unknownSentences)
      req.sessionModel.set(sessionModelFields.SELECTED_COURT_CASE_UUID, courtCaseId)

      // Set court case details for the template
      res.locals.sentenceCount = unknownSentences.length
      res.locals.courtCase = targetCase
      res.locals.courtCaseId = courtCaseId

      return next()
    } catch (error) {
      logger.error('Error in setSentencesInCase middleware', { error: error.message })
      return next(error)
    }
  }

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courtCaseId } = req.params
      res.locals.courtCaseId = courtCaseId

      // Get the sentences from session that were set in middleware
      const sentencesInCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        logger.error('No sentences in current case found in session')
        return res.redirect(`/person/${res.locals.nomisId}/record-recall/update-sentence-types-summary`)
      }

      return super.get(req, res, next)
    } catch (error) {
      logger.error('Error in MultipleSentenceDecisionController.get', { error: error.message })
      return next(error)
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sameSentenceType = req.body.sameSentenceType === 'yes'

      // Set bulk update mode flag
      req.sessionModel.set(sessionModelFields.BULK_UPDATE_MODE, sameSentenceType)

      if (sameSentenceType) {
        // For bulk flow, navigate to bulk sentence type page
        const { courtCaseId } = req.params
        req.form.options.next = `/person/${res.locals.nomisId}/record-recall/bulk-sentence-type/${courtCaseId}`
      } else {
        // For individual flow, initialize the sentence index
        req.sessionModel.set(sessionModelFields.CURRENT_SENTENCE_INDEX, 0)

        // Get the first sentence to determine next URL
        const sentencesInCase = req.sessionModel.get(sessionModelFields.SENTENCES_IN_CURRENT_CASE) as Array<{
          sentenceUuid: string
          isUnknownSentenceType: boolean
        }>

        if (sentencesInCase && sentencesInCase.length > 0) {
          // Set the next step dynamically
          req.form.options.next = `/person/${res.locals.nomisId}/record-recall/select-sentence-type/${sentencesInCase[0].sentenceUuid}`
        }
      }

      super.post(req, res, next)
    } catch (error) {
      logger.error('Error in MultipleSentenceDecisionController.post', { error: error.message })
      next(error)
    }
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
      pageTitle: 'Is the sentence type the same for all sentences in this court case?',
    }
  }
}
