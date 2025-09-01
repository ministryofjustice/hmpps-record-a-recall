import { Router, Request, Response, NextFunction } from 'express'
import { sentenceTypeSchema } from '../../schemas/recall/sentence-type.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import { findSentenceAndCourtCase, getApplicableSentenceTypes } from '../../helpers/sentenceHelper'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import logger from '../../../logger'

const router = Router()

router.get(
  '/select-sentence-type/:sentenceUuid',
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sentenceUuid } = req.params
      const courtCases = getCourtCaseOptions(req as any)

      const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        throw new Error(`Sentence not found: ${sentenceUuid}`)
      }

      const { user } = res.locals
      const sentenceTypes = await getApplicableSentenceTypes(req as any, targetSentence, targetCourtCase, user.username)

      // Check if sentence has already been updated
      const updatedSentences = (req.session.formData?.[sessionModelFields.UPDATED_SENTENCE_TYPES] || {}) as Record<
        string,
        { uuid: string; description: string }
      >
      const selectedType = updatedSentences[sentenceUuid]?.uuid

      const sentenceTypeItems = sentenceTypes.map(type => ({
        value: type.sentenceTypeUuid,
        text: type.description,
        checked: selectedType === type.sentenceTypeUuid,
      }))

      const { prisoner } = res.locals
      const backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`

      res.render('pages/recall/base-question', {
        fields: {
          sentenceType: {
            component: 'govukRadios',
            id: 'sentenceType',
            name: 'sentenceType',
            fieldset: {
              legend: {
                text: 'Select the sentence type',
                classes: 'govuk-fieldset__legend--l',
              },
            },
            items: sentenceTypeItems,
          },
        },
        values: { sentenceType: selectedType },
        errors: req.session.formErrors || {},
        backLink,
        prisoner,
        sentence: targetSentence,
        courtCase: targetCourtCase,
        sentenceUuid,
      })

      delete req.session.formErrors
    } catch (error) {
      logger.error('Error getting sentence type selection', { error: error.message })
      next(error)
    }
  },
)

router.post(
  '/select-sentence-type/:sentenceUuid',
  validateWithZod(sentenceTypeSchema),
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sentenceUuid } = req.params
      const validatedData = req.validatedData as { sentenceType: string }
      const selectedTypeUuid = validatedData.sentenceType

      // Get the court cases to find the sentence description
      const courtCases = getCourtCaseOptions(req as any)
      const { targetSentence, targetCourtCase } = findSentenceAndCourtCase(sentenceUuid, courtCases)

      if (!targetSentence || !targetCourtCase) {
        throw new Error(`Sentence not found: ${sentenceUuid}`)
      }

      // Get the sentence types to find the description
      const { user } = res.locals
      const sentenceTypes = await getApplicableSentenceTypes(req as any, targetSentence, targetCourtCase, user.username)
      const sentenceTypeItem = sentenceTypes.find(type => type.sentenceTypeUuid === selectedTypeUuid)
      const selectedTypeDescription = sentenceTypeItem ? sentenceTypeItem.description : selectedTypeUuid

      // Update the session with the selected sentence type
      const updatedSentences = (req.session.formData?.[sessionModelFields.UPDATED_SENTENCE_TYPES] || {}) as Record<
        string,
        { uuid: string; description: string }
      >
      updatedSentences[sentenceUuid] = {
        uuid: selectedTypeUuid,
        description: selectedTypeDescription,
      }

      req.session.formData = {
        ...req.session.formData,
        [sessionModelFields.UPDATED_SENTENCE_TYPES]: updatedSentences,
      }

      // Check if we're in individual update mode (not bulk)
      const bulkUpdateMode = req.session.formData?.[sessionModelFields.BULK_UPDATE_MODE]

      if (bulkUpdateMode === false) {
        // We're in individual update mode
        const sentencesInCurrentCase = req.session.formData?.[sessionModelFields.SENTENCES_IN_CURRENT_CASE] as
          | Array<{
              sentenceUuid: string
              isUnknownSentenceType: boolean
            }>
          | undefined
        let currentSentenceIndex = req.session.formData?.[sessionModelFields.CURRENT_SENTENCE_INDEX] as
          | number
          | undefined

        if (sentencesInCurrentCase && typeof currentSentenceIndex === 'number') {
          // Move to the next sentence
          currentSentenceIndex += 1
          req.session.formData[sessionModelFields.CURRENT_SENTENCE_INDEX] = currentSentenceIndex

          if (currentSentenceIndex < sentencesInCurrentCase.length) {
            // There are more sentences to update
            const nextSentenceUuid = sentencesInCurrentCase[currentSentenceIndex].sentenceUuid
            logger.info('Moving to next sentence in individual update flow', {
              currentIndex: currentSentenceIndex,
              totalSentences: sentencesInCurrentCase.length,
              nextSentenceUuid,
            })
            return res.redirect(
              `/person/${res.locals.prisoner.prisonerNumber}/record-recall/select-sentence-type/${nextSentenceUuid}`,
            )
          }

          // This was the last sentence, clean up session state
          logger.info('Completed individual sentence update flow', {
            totalSentences: sentencesInCurrentCase.length,
          })
          delete req.session.formData[sessionModelFields.BULK_UPDATE_MODE]
          delete req.session.formData[sessionModelFields.SENTENCES_IN_CURRENT_CASE]
          delete req.session.formData[sessionModelFields.CURRENT_SENTENCE_INDEX]
        }
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      const currentPath = req.path.replace(`/${sentenceUuid}`, '')
      if (!req.session.journeyHistory.includes(currentPath)) {
        req.session.journeyHistory.push(currentPath)
      }

      // Determine next step - typically back to summary page
      const nextStep = resolveNextStep(currentPath, req.session.formData)
      const fullPath = getFullRecallPath(nextStep, req, res)
      res.redirect(fullPath)
    } catch (error) {
      logger.error('Error processing sentence type selection', { error: error.message })
      next(error)
    }
  },
)

export default router
