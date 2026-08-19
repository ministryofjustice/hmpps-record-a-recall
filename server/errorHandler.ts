import type { Request, Response, NextFunction } from 'express'
import type { HTTPError } from 'superagent'
import type { SanitisedError } from '@ministryofjustice/hmpps-rest-client'
import logger from '../logger'
import { saveSession } from './data/sessionRecoveryStore'

type TaggedError = (HTTPError | SanitisedError) & { authTokenType?: 'SYSTEM' | 'USER' }

function extractStatus(error: TaggedError): number | undefined {
  const sanitisedError = error as SanitisedError<{ status?: number }>
  return (error as HTTPError).status ?? sanitisedError.responseStatus ?? sanitisedError.data?.status
}

function extractNomsIdFromUrl(originalUrl: string): string | undefined {
  return originalUrl.match(/^\/person\/([^/?]+)/)?.[1]
}

export default function createErrorHandler(production: boolean) {
  return async (error: TaggedError, req: Request, res: Response, _next: NextFunction): Promise<void> => {
    logger.error(`Error handling request for '${req.originalUrl}', user '${res.locals.user?.username}'`, error)

    const username = res.locals.user?.username
    const paramsNomsId = req.params?.nomsId
    const nomsId =
      (typeof paramsNomsId === 'string' ? paramsNomsId : undefined) ?? extractNomsIdFromUrl(req.originalUrl)
    if (username && nomsId) {
      await saveSession(username, nomsId, req.session)
    }

    const status = extractStatus(error)
    const isSystemTokenFailure = error.authTokenType === 'SYSTEM'

    if ((status === 401 || status === 403) && !isSystemTokenFailure) {
      logger.info('Logging user out')
      return res.redirect('/sign-out')
    }

    if (isSystemTokenFailure) {
      logger.error(`System/client-credentials token call failed with status ${status}`)
    }

    res.locals.message = production
      ? 'Something went wrong. The error has been logged. Please try again'
      : error.message
    res.locals.status = status
    res.locals.stack = production ? null : error.stack

    res.status(status || 500)
    return res.render('pages/error')
  }
}
