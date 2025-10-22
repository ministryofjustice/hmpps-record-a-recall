import { RequestHandler } from 'express'
import { sanitizeString } from '../utils/utils'

export default function populateNomisId(): RequestHandler {
  return async (req, res, next) => {
    res.locals.nomisId = sanitizeString(req.params.nomisId)

    if (!res.locals.nomisId) {
      res.redirect('/search')
      return
    }

    next()
  }
}
