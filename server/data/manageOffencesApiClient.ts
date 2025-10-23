import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'

export default class ManageOffencesApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Manage Offences API', config.apis.manageOffencesApi, logger, authenticationClient)
  }

  async getOffenceByCode(code: string): Promise<Offence> {
    return (await this.get({ path: `/offences/code/unique/${code}` }, asSystem())) as unknown as Promise<Offence>
  }

  async searchOffence(searchString: string): Promise<Offence[]> {
    return (await this.get(
      {
        path: `/offences/search`,
        query: { excludeLegislation: true, searchString },
      },
      asSystem(),
    )) as unknown as Promise<Offence[]>
  }

  async getOffencesByCodes(codes: string[]): Promise<Offence[]> {
    return (await this.get(
      {
        path: '/offences/code/multiple',
        query: { offenceCodes: codes.join() },
      },
      asSystem(),
    )) as unknown as Promise<Offence[]>
  }
}
