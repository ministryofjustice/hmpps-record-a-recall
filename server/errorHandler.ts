import type { Request, Response, NextFunction } from 'express'
import type { HTTPError } from 'superagent'
import type { SanitisedError } from '@ministryofjustice/hmpps-rest-client'
import logger from '../logger'
import { saveSession } from './data/sessionRecoveryStore'
import GrantType from './data/grantType'

type TaggedError = (HTTPError | SanitisedError) & { grantType?: GrantType }

function extractStatus(error: TaggedError): number | undefined {
  const sanitisedError = error as SanitisedError<{ status?: number }>
  return (error as HTTPError).status ?? sanitisedError.responseStatus ?? sanitisedError.data?.status
}

/**
 * When grantType has not been explicitly set
 * assume this is an authorization_code token
 * @param error
 */
function resolveGrantType(error: TaggedError): GrantType {
  return error.grantType ?? GrantType.USER_TOKEN
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
    const isClientCredentialsTokenFailure = resolveGrantType(error) === GrantType.SYSTEM_TOKEN

    if ((status === 401 || status === 403) && !isClientCredentialsTokenFailure) {
      logger.info('Logging user out')
      return res.redirect('/sign-out')
    }

    if (isClientCredentialsTokenFailure) {
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
