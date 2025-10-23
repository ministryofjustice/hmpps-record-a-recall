import { CcrdServiceDefinitions } from '../@types/courtCasesReleaseDatesApi/types'
import logger from '../../logger'
import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'

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
