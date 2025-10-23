import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'
import logger from '../../logger'
import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
export default class CourtRegisterApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Court Register API', config.apis.courtRegisterApi, logger, authenticationClient)
  }

  async getCourtDetails(courtIds: string): Promise<Court[]> {
    return this.get(
      {
        path: `/courts/id/multiple`,
        query: { courtIds },
      },
      asSystem(),
    ) as Promise<Court[]>
  }
}
