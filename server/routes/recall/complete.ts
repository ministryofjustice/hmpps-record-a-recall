import { Router, Request, Response } from 'express'

const router = Router()

router.get('/complete', (req: Request, res: Response) => {
  const { prisoner } = res.locals

  res.render('pages/recall/complete', {
    prisoner,
    successMessage: 'Recall recorded',
  })
})

export default router
