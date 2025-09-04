import { Router, Request, Response } from 'express'
import logger from '../../../logger'

const router = Router()

router.get('/no-sentences-interrupt', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`

  logger.info('No eligible sentences found for recall', { prisonerNumber: prisoner.prisonerNumber })

  res.render('pages/recall/no-sentences-interrupt', {
    values: req.session.formData || {},
    prisoner,
    backLink,
    title: 'No eligible sentences',
    message: 'There are no eligible sentences for this recall. Please check the criteria and try again.',
  })
})

router.post('/no-sentences-interrupt', (req: Request, res: Response) => {
  const { prisoner } = res.locals

  // Redirect to person home or back to revocation date to try again
  res.redirect(`/person/${prisoner.prisonerNumber}`)
})

export default router
