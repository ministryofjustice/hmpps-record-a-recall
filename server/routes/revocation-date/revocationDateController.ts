import { Request, Response, NextFunction } from 'express'
import { Controller } from '../controller'

export default class RevocationDateController implements Controller {
  GET = async (req: Request<{ nomsId: string; calculationRequestId: string }>, res: Response): Promise<void> => {
    const { nomisId, recallId, prisoner } = res.locals

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

    return res.render('pages/recall/revocation-date', {
      prisoner,
      nomisId,
      isEditRecall: isEditMode,
      backLink,
      cancelUrl,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }
}
