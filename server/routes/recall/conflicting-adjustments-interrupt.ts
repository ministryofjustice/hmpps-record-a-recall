import { Router, Request, Response } from 'express'
import logger from '../../../logger'

const router = Router()

router.get('/conflicting-adjustments-interrupt', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`

  logger.info('Conflicting adjustments found for recall', { prisonerNumber: prisoner.prisonerNumber })

  res.render('pages/recall/conflicting-adjustments-interrupt', {
    values: req.session.formData || {},
    prisoner,
    backLink,
    title: 'Conflicting adjustments',
    message: 'There are conflicting adjustments that prevent this recall from being processed automatically.',
  })
})

router.post('/conflicting-adjustments-interrupt', (req: Request, res: Response) => {
  const { prisoner } = res.locals

  // Continue to manual recall process
  res.redirect(`/person/${prisoner.prisonerNumber}/record-recall/manual-recall-intercept`)
})

export default router
