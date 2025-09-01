import { Response } from 'express'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'

export default class NoCasesSelectedController extends RecallBaseController {
  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
    }
  }
}
