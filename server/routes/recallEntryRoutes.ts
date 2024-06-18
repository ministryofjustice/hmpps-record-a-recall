import { RequestHandler } from 'express'

export default class RecallEntryRoutes {
  constructor() {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { token } = res.locals.user
    return res.render('pages/recallEntry/enter-recall-date')
  }
}
