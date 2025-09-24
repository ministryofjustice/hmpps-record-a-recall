import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import getServiceUrls from '../../helpers/urlHelper'

/**
 * ViewPersonHomeController - Displays the person home page with recall information
 */
export default async (req: Request, res: Response) => {
  const { nomisId, prisoner, recalls, serviceDefinitions, banner, errorMessage } = res.locals

  if (prisoner) {
    const urls = getServiceUrls(nomisId)
    const useV2RecallFlow = process.env.USE_V2_RECALL_FLOW === 'true'

    const sortedRecalls = [...recalls].sort((a, b) => {
      const getDate = (recall: Recall) => {
        if (recall.source === 'DPS') {
          return recall.revocationDate ? new Date(recall.revocationDate) : new Date(0)
        }
        return recall.createdAt ? new Date(recall.createdAt) : new Date(0)
      }

      return getDate(b).getTime() - getDate(a).getTime()
    })

    return res.render('pages/person/home', {
      nomisId,
      prisoner,
      recalls: sortedRecalls,
      banner,
      urls,
      serviceDefinitions,
      errorMessage,
      latestRecallId: res.locals.latestRecallId,
      useV2RecallFlow,
    })
  }

  req.flash('errorMessage', `Prisoner details for ${nomisId} not found`)
  return res.redirect('/search')
}
