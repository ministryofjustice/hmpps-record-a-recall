import type { Request, Response, NextFunction } from 'express'
import type { HTTPError } from 'superagent'
import logger from '../logger'

export default function createErrorHandler(production: boolean) {
  return (error: HTTPError, req: Request, res: Response, next: NextFunction): void => {
    logger.error(`Error handling request for '${req.originalUrl}', user '${res.locals.user?.username}'`, error)
    if (error.status === 401 || error.status === 403) {
      logger.info('Logging user out')
      return res.redirect('/sign-out')
    }
    const userFacingError = 'Something went wrong. The error has been logged. Please try again'
    res.locals.message = production ? userFacingError : error.message
    req.flash('errorMessage', production ? userFacingError : error.message)
    res.locals.status = error.status
    res.locals.stack = production ? null : error.stack

    res.status(error.status || 500)
    const nomisId = `${req.originalUrl}`.split('/')[2]

    return !nomisId ? res.render('pages/error') : res.redirect(`/person/${nomisId}`)
  }
}
