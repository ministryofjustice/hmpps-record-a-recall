import { Router, Request, Response, NextFunction } from 'express'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import { getCourtCaseOptionsFromSession } from '../../helpers/migratedFormHelper'
import { formatDateStringToDDMMYYYY } from '../../utils/utils'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import logger from '../../../logger'

const router = Router()

router.get('/select-court-case', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisoner } = res.locals
    const formData = req.session.formData || {}

    // Get court case options from session
    const courtCases = getCourtCaseOptionsFromSession(req) || res.locals.recallableCourtCases || []

    // Filter for active court cases
    const activeCases = courtCases.filter((c: any) => c.status !== 'DRAFT')

    if (activeCases.length === 0) {
      // No cases available - redirect to no cases page
      return res.redirect(getFullRecallPath('no-cases-selected', req, res))
    }

    // Track which court case we're currently asking about
    const currentCaseIndex = Number(formData.currentCaseIndex) || 0
    const selectedCases: string[] = Array.isArray(formData.selectedCourtCases) 
      ? formData.selectedCourtCases 
      : formData.selectedCourtCases 
      ? [formData.selectedCourtCases] 
      : []
    
    logger.info('Court case selection GET:', {
      currentCaseIndex,
      totalCases: activeCases.length,
      selectedCases,
      courtCaseIds: req.session.formData?.courtCaseIds,
      formDataKeys: Object.keys(formData),
    })

    if (currentCaseIndex >= activeCases.length) {
      // We've asked about all cases - save and continue
      req.session.formData = {
        ...req.session.formData,
        courtCaseIds: selectedCases,
      }
      // Clean up temporary selection state
      delete req.session.formData.currentCaseIndex
      delete req.session.formData.selectedCourtCases
      
      logger.info('GET: All court cases have been selected, redirecting:', {
        courtCaseIds: selectedCases,
      })
      
      const nextStep = resolveNextStep('/select-court-case', req.session.formData)
      return res.redirect(getFullRecallPath(nextStep, req, res))
    }

    const currentCase = activeCases[currentCaseIndex]
    const convictionDate = currentCase.date
      ? formatDateStringToDDMMYYYY(currentCase.date)
      : 'Unknown date'

    const backLink = currentCaseIndex > 0 
      ? `/person/${prisoner.prisonerNumber}/record-recall/select-court-case`
      : `/person/${prisoner.prisonerNumber}/record-recall/manual-recall-intercept`

    res.render('pages/recall/base-question', {
      fields: {
        includeCase: {
          component: 'govukRadios',
          id: 'includeCase',
          name: 'includeCase',
          fieldset: {
            legend: {
              text: 'Select all cases that had an active sentence',
              classes: 'govuk-fieldset__legend--l',
            },
          },
          hint: {
            html: `<p class="govuk-body govuk-!-font-weight-bold">Case ${currentCaseIndex + 1} of ${activeCases.length}</p>
                   <p class="govuk-body">${currentCase.courtName || 'Unknown court'} - ${convictionDate}</p>
                   <p class="govuk-body">${currentCase.reference || ''}</p>
                   <p class="govuk-body">Include this case in the recall?</p>`,
          },
          items: [
            {
              text: 'Yes',
              value: 'YES',
            },
            {
              text: 'No',
              value: 'NO',
            },
          ],
        },
      },
      values: formData,
      errors: req.session.formErrors || {},
      backLink,
      prisoner,
      submitButtonText: 'Continue',
      submitButtonAttributes: {
        'data-qa': 'continue-btn',
      },
    })

    delete req.session.formErrors
  } catch (error) {
    logger.error('Error rendering select court case page:', error)
    next(error)
  }
})

router.post(
  '/select-court-case',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { includeCase } = req.body
      const { prisoner } = res.locals
      const formData = req.session.formData || {}
      
      // Get court case options from session
      const courtCases = getCourtCaseOptionsFromSession(req) || res.locals.recallableCourtCases || []
      const activeCases = courtCases.filter((c: any) => c.status !== 'DRAFT')
      
      const currentCaseIndex = Number(formData.currentCaseIndex) || 0
      const selectedCases: string[] = Array.isArray(formData.selectedCourtCases) 
        ? formData.selectedCourtCases 
        : formData.selectedCourtCases 
        ? [formData.selectedCourtCases] 
        : []
      const currentCase = activeCases[currentCaseIndex]

      // If user selected YES, add this case to selected cases
      if (includeCase === 'YES' && currentCase) {
        selectedCases.push(currentCase.courtCaseUuid || currentCase.caseId)
      }

      // Move to next case
      const nextCaseIndex = currentCaseIndex + 1
      
      logger.info('Court case selection progress:', {
        currentCaseIndex,
        nextCaseIndex,
        totalCases: activeCases.length,
        selectedCases,
        includeCase,
      })

      // Save progress to session
      req.session.formData = {
        ...req.session.formData,
        currentCaseIndex: nextCaseIndex,
        selectedCourtCases: selectedCases,
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (currentCaseIndex === 0 && !req.session.journeyHistory.includes(req.path)) {
        req.session.journeyHistory.push(req.path)
      }

      // If we've asked about all cases, move to next step
      if (nextCaseIndex >= activeCases.length) {
        req.session.formData.courtCaseIds = selectedCases
        delete req.session.formData.currentCaseIndex
        delete req.session.formData.selectedCourtCases
        
        // Check if any selected court cases have unknown sentences
        const courtCases = (req.session.formData.courtCases || []) as any[]
        const selectedCourtCases = courtCases.filter((c: any) => selectedCases.includes(c.caseId))
        const hasUnknownSentences = selectedCourtCases.some((courtCase: any) => 
          courtCase.sentences?.some((sentence: any) => 
            sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL
          )
        )
        
        logger.info('All court cases selected, checking for unknown sentences:', {
          selectedCases,
          hasUnknownSentences,
          formData: req.session.formData,
        })
        
        // If there are unknown sentences, go to update-sentence-types-summary
        let nextStep = resolveNextStep('/select-court-case', req.session.formData)
        if (hasUnknownSentences) {
          nextStep = '/update-sentence-types-summary'
        }
        
        const fullPath = getFullRecallPath(nextStep, req, res)
        
        logger.info('Redirecting after court case selection:', {
          nextStep,
          fullPath,
          hasUnknownSentences,
        })
        
        return res.redirect(fullPath)
      }

      // Otherwise, show the next case
      logger.info('Showing next court case')
      res.redirect(`/person/${prisoner.prisonerNumber}/record-recall/select-court-case`)
    } catch (error) {
      logger.error('Error processing court case selection:', error)
      next(error)
    }
  },
)

export default router
