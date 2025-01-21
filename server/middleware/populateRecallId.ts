import { RequestHandler } from 'express'
import { sanitizeString } from '../utils/utils'

export default function populateRecallId(): RequestHandler {
  return async (req, res, next) => {
    res.locals.recallId = sanitizeString(req.params.recallId)

    if (!res.locals.recallId) {
      res.redirect('/search')
      return
    }

    next()
  }
}
