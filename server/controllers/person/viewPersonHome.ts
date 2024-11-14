import { Request, Response } from 'express'
import logger from '../../../logger'
import PrisonerService from '../../services/prisonerService'

export default async (req: Request, res: Response) => {
  await setPrisonerDetailsInLocals(req.services.prisonerService, res)

  const banner: {
    success?: {
      title: string
      content: string
    }
  } = {}

  const success = req.flash('success')
  if (success?.length) {
    // @ts-expect-error This works
    // eslint-disable-next-line prefer-destructuring
    banner.success = success[0]
  }

  const { nomisId, prisoner } = res.locals
  try {
    const recalls = await req.services.recallService.getAllRecalls(nomisId, res.locals.user.username)
    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      recalls,
      banner,
    })
  } catch (error) {
    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      error,
    })
  }
}

export async function setPrisonerDetailsInLocals(prisonerService: PrisonerService, res: Response) {
  const { nomisId } = res.locals
  return prisonerService
    .getPrisonerDetails(nomisId, res.locals.user.username)
    .then(prisoner => {
      res.locals.prisoner = prisoner
    })
    .catch(error => {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
      res.redirect('/search')
    })
}