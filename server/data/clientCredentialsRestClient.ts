import { RestClient, AuthOptions, ApiConfig } from '@ministryofjustice/hmpps-rest-client'
import type { SanitisedError, AuthenticationClient } from '@ministryofjustice/hmpps-rest-client'
import type Logger from 'bunyan'
import ClientCredentialsTokenStore from './clientCredentialsTokenStore'
import GrantType from './grantType'

/**
 * Adapter/proxy around RestClient to ensure every request automatically goes through the pattern of:
 *  - client-credentials-token 401/403 -> evict cached token -> retry once
 *  Note all errors also tagged with grantType: CLIENT_CREDENTIALS
 */
export default class ClientCredentialsRestClient {
  private readonly client: RestClient

  protected readonly logger: Logger | Console

  constructor(
    name: string,
    config: ApiConfig,
    logger: Logger | Console,
    authenticationClient: AuthenticationClient,
    private readonly tokenStore: ClientCredentialsTokenStore,
  ) {
    this.logger = logger
    this.client = new RestClient(name, config, logger, authenticationClient)
  }

  private handleError<Response, ErrorData>(path: string, method: string, error: SanitisedError<ErrorData>): Response {
    this.logger.warn({ ...error }, `Error calling path: '${path}', verb: '${method}'`)
    throw Object.assign(error, { grantType: GrantType.SYSTEM_TOKEN as const })
  }

  private tokenKeyFor(authOptions?: AuthOptions | string): string | undefined {
    if (!authOptions || typeof authOptions === 'string') return undefined
    return authOptions.user?.username || '%ANONYMOUS%'
  }

  /**
   * Wraps a client-credentials-authenticated call: if it fails with 401 / 403, evicts the cached
   * client-credentials token for that key and retries exactly once with a new token.
   */
  private async withTokenRetry<T>(authOptions: AuthOptions | string | undefined, call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      const status = (error as SanitisedError)?.responseStatus
      const key = this.tokenKeyFor(authOptions)
      if ((status === 401 || status === 403) && key) {
        this.logger.warn(
          `client-credentials token rejected (status ${status}) — evicting cached token for '${key}' and retrying once`,
        )
        await this.tokenStore.evictToken(key)
        return call()
      }
      throw error
    }
  }

  async get<Response = unknown, ErrorData = unknown>(
    request: Parameters<RestClient['get']>[0],
    authOptions?: AuthOptions | string,
  ): Promise<Response> {
    return this.withTokenRetry(authOptions, () =>
      this.client.get<Response, ErrorData>({ ...request, errorHandler: this.handleError.bind(this) }, authOptions),
    )
  }

  async post<Response = unknown, ErrorData = unknown>(
    request: Parameters<RestClient['post']>[0],
    authOptions?: AuthOptions | string,
  ): Promise<Response> {
    return this.withTokenRetry(authOptions, () =>
      this.client.post<Response, ErrorData>({ ...request, errorHandler: this.handleError.bind(this) }, authOptions),
    )
  }

  async put<Response = unknown, ErrorData = unknown>(
    request: Parameters<RestClient['put']>[0],
    authOptions?: AuthOptions | string,
  ): Promise<Response> {
    return this.withTokenRetry(authOptions, () =>
      this.client.put<Response, ErrorData>({ ...request, errorHandler: this.handleError.bind(this) }, authOptions),
    )
  }

  async patch<Response = unknown, ErrorData = unknown>(
    request: Parameters<RestClient['patch']>[0],
    authOptions?: AuthOptions | string,
  ): Promise<Response> {
    return this.withTokenRetry(authOptions, () =>
      this.client.patch<Response, ErrorData>({ ...request, errorHandler: this.handleError.bind(this) }, authOptions),
    )
  }

  async delete<Response = unknown, ErrorData = unknown>(
    request: Parameters<RestClient['delete']>[0],
    authOptions?: AuthOptions | string,
  ): Promise<Response> {
    return this.withTokenRetry(authOptions, () =>
      this.client.delete<Response, ErrorData>({ ...request, errorHandler: this.handleError.bind(this) }, authOptions),
    )
  }
}
