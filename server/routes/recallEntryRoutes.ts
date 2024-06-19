import { RequestHandler } from 'express'

export default class RecallEntryRoutes {
  constructor() {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    return res.render('pages/recallEntry/enter-recall-date')
  }

  public getEnterReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    return res.render('pages/recallEntry/enter-return-to-custody-date', { nomsId })
  }
}
