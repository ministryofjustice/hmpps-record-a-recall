import { Response, NextFunction } from 'express'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import { setSessionValue } from '../../helpers/sessionHelper'

export default class ManualRecallInterceptController extends RecallBaseController {
  async get(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    const locals = this.locals(req, res)
    res.render('pages/recall/manual-recall-intercept.njk', locals)
  }

  async post(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    if ('continue' in req.body) {
      setSessionValue(req, 'select-court-case-details.njk', 'confirmed')
    }
    if ('cancel' in req.body) {
      return res.redirect(303, `${req.baseUrl}/confirm-cancel`)
    }
    return super.post(req, res, next)
  }
}
