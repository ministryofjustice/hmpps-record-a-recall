import { Request, Response } from 'express'
import getServiceUrls from '../../helpers/urlHelper'

/**
 * ViewPersonHomeController - Displays the person home page with recall information
 */
export default async (req: Request, res: Response) => {
  const { nomisId, prisoner, recalls, serviceDefinitions, banner, errorMessage } = res.locals

  if (prisoner) {
    const urls = getServiceUrls(nomisId)

    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      recalls,
      banner,
      urls,
      serviceDefinitions,
      errorMessage,
      latestRecallId: res.locals.latestRecallId,
      firstDayInCustody: res.locals.firstDayInCustody,
    })
  }

  req.flash('errorMessage', `Prisoner details for ${nomisId} not found`)
  return res.redirect('/search')
}
