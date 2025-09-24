import { Request, Response } from 'express'

/**
 * UnderConstructionController - Displays a temporary "under construction" page for the V2 recall flow
 */
export default async (req: Request, res: Response) => {
  const { nomisId } = req.params
  const { prisoner } = res.locals

  return res.render('pages/recall/v2RecallFlow/underConstruction', {
    nomisId,
    prisoner,
    backLink: `/person/${nomisId}`,
  })
}
