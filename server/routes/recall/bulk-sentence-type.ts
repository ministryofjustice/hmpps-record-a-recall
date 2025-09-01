import { Router, Request, Response, NextFunction } from 'express'
import type { CourtCase } from 'models'
import { sentenceTypeSchema } from '../../schemas/recall/sentence-type.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import { findSentenceAndCourtCase, getApplicableSentenceTypes } from '../../helpers/sentenceHelper'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import logger from '../../../logger'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const router = Router()

async function getCommonApplicableSentenceTypes(
  req: Request,
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
      return getApplicableSentenceTypes(req as any, targetSentence, targetCase, username)
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

router.get(
  '/bulk-sentence-type/:courtCaseId',
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courtCaseId } = req.params
      const courtCases = getCourtCaseOptions(req as any)
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        throw new Error(`Court case not found: ${courtCaseId}`)
      }

      const sentencesInCase = req.session.formData?.[sessionModelFields.SENTENCES_IN_CURRENT_CASE] as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        logger.error('No sentences in current case found in session')
        return res.redirect(`/person/${res.locals.prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`)
      }

      const { user } = res.locals
      const sentenceTypes = await getCommonApplicableSentenceTypes(
        req,
        sentencesInCase,
        courtCases,
        targetCase,
        user.username,
      )

      const sentenceTypeItems = sentenceTypes.map(type => ({
        value: type.sentenceTypeUuid,
        text: type.description,
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
                text: 'Select sentence type for all sentences',
                classes: 'govuk-fieldset__legend--l',
              },
            },
            items: sentenceTypeItems,
          },
        },
        values: req.session.formData || {},
        errors: req.session.formErrors || {},
        backLink,
        prisoner,
        courtCase: targetCase,
        sentenceCount: sentencesInCase.length,
        courtCaseId,
      })

      delete req.session.formErrors
    } catch (error) {
      logger.error('Error getting bulk sentence type selection', { error: error.message })
      next(error)
    }
  },
)

router.post(
  '/bulk-sentence-type/:courtCaseId',
  validateWithZod(sentenceTypeSchema),
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courtCaseId } = req.params
      const validatedData = req.validatedData as { sentenceType: string }
      const selectedTypeUuid = validatedData.sentenceType

      // Get court cases to validate
      const courtCases = getCourtCaseOptions(req as any)
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        throw new Error(`Court case not found: ${courtCaseId}`)
      }

      // Get all sentences for this court case from session
      const sentencesInCase = req.session.formData?.[sessionModelFields.SENTENCES_IN_CURRENT_CASE] as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        throw new Error('No sentences found in session')
      }

      // Get the sentence types to find the description
      const { user } = res.locals
      const sentenceTypes = await getCommonApplicableSentenceTypes(
        req,
        sentencesInCase,
        courtCases,
        targetCase,
        user.username,
      )

      const sentenceTypeItem = sentenceTypes.find(type => type.sentenceTypeUuid === selectedTypeUuid)
      const selectedTypeDescription = sentenceTypeItem ? sentenceTypeItem.description : selectedTypeUuid

      // Get existing updated sentences or initialize empty object
      const updatedSentences = (req.session.formData?.[sessionModelFields.UPDATED_SENTENCE_TYPES] || {}) as Record<
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
      req.session.formData = {
        ...req.session.formData,
        [sessionModelFields.UPDATED_SENTENCE_TYPES]: updatedSentences,
      }

      // Clear bulk update mode and related session data
      delete req.session.formData[sessionModelFields.BULK_UPDATE_MODE]
      delete req.session.formData[sessionModelFields.SENTENCES_IN_CURRENT_CASE]
      delete req.session.formData[sessionModelFields.CURRENT_SENTENCE_INDEX]

      logger.info('Bulk sentence type update completed', {
        courtCaseId,
        sentenceCount: sentencesInCase.length,
        selectedType: selectedTypeDescription,
      })

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      const currentPath = req.path.replace(`/${courtCaseId}`, '')
      if (!req.session.journeyHistory.includes(currentPath)) {
        req.session.journeyHistory.push(currentPath)
      }

      // Navigate back to update-sentence-types-summary
      res.redirect(`/person/${res.locals.prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`)
    } catch (error) {
      logger.error('Error processing bulk sentence type update', { error: error.message })
      next(error)
    }
  },
)

export default router
