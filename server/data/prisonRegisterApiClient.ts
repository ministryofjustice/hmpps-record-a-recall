import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { PrisonDto, PrisonRequest } from '../@types/prisonRegisterApi'

export default class PrisonRegisterApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prison Register API', config.apis.prisonRegisterApi, logger, authenticationClient)
  }

  getPrisonNames(prisonIds: string[], username: string): Promise<PrisonDto[]> {
    const searchRequest: PrisonRequest = { prisonIds }
    return this.post({ path: '/prisons/prisonsByIds', data: searchRequest }, asSystem(username)) as Promise<PrisonDto[]>
  }
}
