import { Request, Response } from 'express'
import getServiceUrls from '../../helpers/urlHelper'

/**
 * ViewPersonHomeController - Displays the person home page with recall information
 * Now uses DataFlowService for standardized data loading
 */
export default async (req: Request, res: Response) => {
  // Use DataFlowService to load all required data
  await req.dataFlowService.setPrisonerDetails(res)
  await req.dataFlowService.setRecallsWithLocationNames(res)
  await req.dataFlowService.setServiceDefinitions(req, res)
  await req.dataFlowService.setCommonTemplateData(req, res)

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
    })
  }

  req.flash('errorMessage', `Prisoner details for ${nomisId} not found`)
  return res.redirect('/search')
}
