import { Request, Response } from 'express'
import { getSessionData } from '../service/recordARecallSessionService'
import { createFieldError } from '../../validation/utils/errorFormatting'

export async function get(req: Request, res: Response): Promise<void> {
  const { nomisId, recallId } = res.locals
  const prisoner = res.locals.prisoner

  // Detect if this is edit mode from URL path
  const isEditMode = req.originalUrl.includes('/edit-recall/')
  const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

  // Build back link based on mode
  let backLink: string
  if (isEditMode) {
    backLink = `/person/${nomisId}/edit-recall/${recallId}/edit-summary`
  } else if (isEditFromCheckYourAnswers) {
    backLink = `/person/${nomisId}/record-recall/check-your-answers`
  } else {
    backLink = `/person/${prisoner?.prisonerNumber || nomisId}`
  }

  // Build cancel URL based on mode
  const cancelUrl = isEditMode
    ? `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`
    : `/person/${prisoner?.prisonerNumber || nomisId}/record-recall/confirm-cancel`

  // If not coming from a validation redirect, load from session
  if (!res.locals.formResponses) {
    const sessionData = getSessionData(req, prisoner.prisonerNumber)
    // Parse the date string from session to populate the form fields
    let dateParts = {}
    if (sessionData?.recall?.revocationDate) {
      // Date is stored as 'yyyy-MM-dd' string in session
      const dateStr = sessionData.recall.revocationDate
      const date = new Date(dateStr)
      if (!Number.isNaN(date.getTime())) {
        // Need to account for timezone - use UTC to avoid date shifts
        const utcDate = new Date(`${dateStr}T00:00:00Z`)
        dateParts = {
          'revocationDate-day': utcDate.getUTCDate().toString(),
          'revocationDate-month': (utcDate.getUTCMonth() + 1).toString(), // Month is 0-indexed
          'revocationDate-year': utcDate.getUTCFullYear().toString(),
        }
      }
    }
    res.locals.formResponses = dateParts
  }

  res.render('pages/recall/revocation-date', {
    prisoner,
    nomisId,
    isEditRecall: isEditMode,
    backLink,
    cancelUrl,
    validationErrors: res.locals.validationErrors,
    formResponses: res.locals.formResponses,
  })

  async function post(req: Request, res: Response): Promise<void> {
    const { revocationDate } = req.body
    const { nomisId, recallId } = res.locals
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const sessionData = getSessionData(req, prisoner.prisonerNumber)

    const errorRedirectUrl = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/revocation-date`
      : `/person/${nomisId}/record-recall/revocation-date`

    // Ensure we have a valid Date object
    const revocationDateObj = revocationDate instanceof Date ? revocationDate : new Date(revocationDate)
    if (Number.isNaN(revocationDateObj.getTime())) {
      const fieldError = createFieldError('revocationDate', 'Enter a valid recall date')
      const session = req.session as any
      session.validationErrors = fieldError
      //   session.formValues = req.body // Store form values for re-population
      return res.redirect(errorRedirectUrl)
    }

    // Additional validation against earliest sentence date
    if (sessionData.earliestSentenceDate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (revocationDateObj < sessionData.earliestSentenceDate) {
        const fieldError = createFieldError('revocationDate', 'Recall date must be after the earliest sentence date')
        const session = req.session as any
        session.validationErrors = fieldError
        //   session.formValues = req.body // Store form values for re-population
        return res.redirect(errorRedirectUrl)
      }
    }
    const successUrl = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/edit-summary`
      : `/person/${nomisId}/record-recall/rtc-date`
    return res.redirect(successUrl)
  }
}
