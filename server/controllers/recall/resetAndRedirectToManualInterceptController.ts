import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import resetRecallSession from '../../helpers/resetSessionHelper'

export default class ResetAndRedirectToManualController extends RecallBaseController {
  async get(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      resetRecallSession(req as any)
      res.redirect(`${req.baseUrl}/manual-recall-intercept`)
    } catch (err) {
      next(err)
    }
  }
}
