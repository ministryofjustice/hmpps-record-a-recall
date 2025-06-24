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
  const error = req.flash('errorMessage')

  const { nomisId, prisoner } = res.locals
  const { username } = res.locals.user

  const urls = getServiceUrls(nomisId)

  if (prisoner) {
    let recalls: Recall[]
    let serviceDefinitions
    try {
      recalls = await req.services.recallService.getAllRecalls(nomisId, username)
      const locationIds = recalls.map(r => r.location)
      const prisonNames = await req.services.prisonService.getPrisonNames(locationIds, username)
      // eslint-disable-next-line no-param-reassign,no-return-assign
      recalls.forEach(r => (r.locationName = prisonNames.get(r.location)))
      serviceDefinitions = await req.services.courtCasesReleaseDatesService.getServiceDefinitions(
        nomisId,
        req.user.token,
      )
    } catch (e) {
      logger.error(e)
    }
    // Nothing to do.

    // wrap in try catch 
    const recallableCourtCases = await req.services.courtCaseService.getRecallableCourtCases(username, nomisId)

    console.log(recallableCourtCases)

    // Find the latest recall by createdAt date
    let latestRecallId: string | undefined
    if (recalls && recalls.length > 0) {
      const latestRecall = recalls.reduce((latest, current) => {
        if (
          !latest ||
          (current.createdAt && latest.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))
        ) {
          return current
        }
        return latest
      }, null)
      latestRecallId = latestRecall?.recallId
    }

    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      recalls,
      banner,
      urls,
      serviceDefinitions,
      errorMessage: error?.length ? error[0] : null,
      latestRecallId,
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
