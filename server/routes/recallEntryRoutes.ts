import { RequestHandler } from 'express'

export default class RecallEntryRoutes {
  constructor() {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    return res.render('pages/recallEntry/enter-recall-date')
  }
}
