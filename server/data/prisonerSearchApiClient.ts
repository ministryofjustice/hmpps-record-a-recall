import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { PagedCollectionOfPrisoners, PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import logger from '../../logger'
import config from '../config'

export default class PrisonerSearchApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prisoner Search API', config.apis.prisonerSearchApi, logger, authenticationClient)
  }

  async getPrisonerDetails(nomsId: string): Promise<PrisonerSearchApiPrisoner> {
    return this.get({ path: `/prisoner/${nomsId}` }, asSystem()) as Promise<PrisonerSearchApiPrisoner>
  }

  async getPrisonInmates(prisonId: string): Promise<PagedCollectionOfPrisoners> {
    return this.get(
      {
        path: `/prison/${prisonId}/prisoners?size=1000`,
      },
      asSystem(),
    ) as Promise<PagedCollectionOfPrisoners>
  }
}
