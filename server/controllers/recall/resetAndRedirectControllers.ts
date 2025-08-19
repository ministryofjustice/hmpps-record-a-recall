/* eslint-disable max-classes-per-file */
import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import resetRecallSession from '../../helpers/resetSessionHelper'

export class ResetAndRedirectToManualController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      resetRecallSession(req)
      res.redirect(`${req.baseUrl}/manual-recall-intercept`)
    } catch (err) {
      next(err)
    }
  }
}

export class ResetAndRedirectToRevDateController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      resetRecallSession(req)
      res.redirect(`${req.baseUrl}/revocation-date`)
    } catch (err) {
      next(err)
    }
  }
}
