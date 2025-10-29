import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'

export default class CourtRegisterApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Court Register API', config.apis.courtRegisterApi, logger, authenticationClient)
  }

  async getCourtDetails(courtIds: string[], username: string): Promise<Court[]> {
    return this.get(
      {
        path: `/courts/id/multiple`,
        query: { courtIds: courtIds.join(',') },
      },
      asSystem(username),
    ) as Promise<Court[]>
  }
}
