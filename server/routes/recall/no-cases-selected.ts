import { Router, Request, Response } from 'express'
import logger from '../../../logger'

const router = Router()

// GET handler for no-cases-selected page
router.get('/no-cases-selected', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/select-court-case`

  logger.info('Displaying no cases selected page', { prisonerNumber: prisoner.prisonerNumber })

  res.render('no-cases-selected', {
    values: req.session.formData || {},
    prisoner,
    backLink,
  })
})

// POST handler - this page typically just has a button to go back
router.post('/no-cases-selected', (req: Request, res: Response) => {
  const { prisoner } = res.locals

  // Redirect back to court case selection
  res.redirect(`/person/${prisoner.prisonerNumber}/record-recall/select-court-case`)
})

export default router
