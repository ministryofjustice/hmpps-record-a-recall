import { asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { Prison, PrisonsSearchRequest } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import SystemRestClient from './systemRestClient'

export default class PrisonRegisterApiClient extends SystemRestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prison Register API', config.apis.prisonRegisterApi, logger, authenticationClient)
  }

  getPrisonNames(prisonIds: string[], username: string): Promise<Prison[]> {
    const searchRequest: PrisonsSearchRequest = { prisonIds }
    return this.post({ path: '/prisons/prisonsByIds', data: searchRequest }, asSystem(username)) as Promise<Prison[]>
  }
}
