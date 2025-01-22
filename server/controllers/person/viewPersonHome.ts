import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../../logger'
import PrisonerService from '../../services/prisonerService'
import getServiceUrls from '../../helpers/urlHelper'

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

  const urls = getServiceUrls(nomisId)

  if (prisoner) {
    let recalls: Recall[]
    let serviceDefinitions
    try {
      recalls = await req.services.recallService.getAllRecalls(nomisId, res.locals.user.username)
      serviceDefinitions = await req.services.courtCasesReleaseDatesService.getServiceDefinitions(
        nomisId,
        req.user.token,
      )
    } catch {
      // Nothing to do.
    }

    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      recalls,
      banner,
      urls,
      serviceDefinitions,
    })
  }
  req.flash('errorMessage', `Prisoner details for ${nomisId} not found`)
  return res.redirect('/search')
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
    })
}
