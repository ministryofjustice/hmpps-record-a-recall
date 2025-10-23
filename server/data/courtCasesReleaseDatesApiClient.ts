import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { CcrdServiceDefinitions } from '../@types/courtCasesReleaseDatesApi/types'

export default class CourtCasesReleaseDatesApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Court Cases Release Dates API', config.apis.courtCasesReleaseDatesApi, logger, authenticationClient)
  }

  getServiceDefinitions(prisonerId: string): Promise<CcrdServiceDefinitions> {
    return this.get(
      {
        path: `/service-definitions/prisoner/${prisonerId}`,
      },
      asSystem(),
    ) as Promise<CcrdServiceDefinitions>
  }
}
