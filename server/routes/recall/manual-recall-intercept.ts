import { Router, Request, Response, NextFunction } from 'express'
import logger from '../../../logger'

const router = Router()

router.get('/manual-recall-intercept', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const formData = req.session.formData || {}

  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
  const journeyBaseLink = `/person/${prisoner.prisonerNumber}/record-recall`

  res.render('pages/recall/manual-recall-intercept', {
    values: formData,
    errors: req.session.formErrors || {},
    backLink,
    journeyBaseLink,
    prisoner,
    csrfToken: req.csrfToken && req.csrfToken(),
  })

  delete req.session.formErrors
})

router.post('/manual-recall-intercept', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { prisoner } = res.locals

    // Track journey history
    if (!req.session.journeyHistory) {
      req.session.journeyHistory = []
    }
    if (!req.session.journeyHistory.includes(req.path)) {
      req.session.journeyHistory.push(req.path)
    }

    // For manual recall intercept, we continue with manual case selection
    // The user has been informed they need to select all relevant cases
    const nextStep = `/person/${prisoner.prisonerNumber}/record-recall/select-court-case`

    res.redirect(nextStep)
  } catch (error) {
    logger.error('Error processing manual recall intercept:', error)
    next(error)
  }
})

export default router
