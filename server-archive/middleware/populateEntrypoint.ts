import { RequestHandler } from 'express'

export default function populateEntrypoint(): RequestHandler {
  return async (req, res, next) => {
    if (req.query.entrypoint) {
      res.locals.entrypoint = req.query.entrypoint
    }
    next()
  }
}
