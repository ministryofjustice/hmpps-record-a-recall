import { RequestHandler } from 'express'

export default class RecallEntryRoutes {
  constructor() {}

  public getEnterDates: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { token } = res.locals.user
    return res.render('pages/recallEntry/enter-dates')
  }
}
