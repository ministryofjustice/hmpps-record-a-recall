import { Response, NextFunction } from 'express'
import FormWizard from 'hmpo-form-wizard'
import RecallBaseController from './recallBaseController'
import { SessionManager } from '../../services/sessionManager'

export default class ManualRecallInterceptController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const locals = this.locals(req, res)
    res.render('pages/recall/manual-recall-intercept.njk', locals)
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    if ('continue' in req.body) {
      SessionManager.setSessionValue(req, 'select-court-case-details.njk', 'confirmed')
    }
    if ('cancel' in req.body) {
      return res.redirect(303, `${req.baseUrl}/confirm-cancel`)
    }
    return super.post(req, res, next)
  }
}
