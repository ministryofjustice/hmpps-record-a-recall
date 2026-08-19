import { RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { SanitisedError } from '@ministryofjustice/hmpps-rest-client'

/**
 * The Oauth2 Client_Credentials client
 */
export default class SystemRestClient extends RestClient {
  protected handleError<Response, ErrorData>(path: string, method: string, error: SanitisedError<ErrorData>): Response {
    this.logger.warn({ ...error }, `Error calling ${this.name}, path: '${path}', verb: '${method}'`)
    throw Object.assign(error, { authTokenType: 'SYSTEM' as const })
  }
}
