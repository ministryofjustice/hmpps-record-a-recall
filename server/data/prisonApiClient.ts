import { asUser, RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { Readable } from 'stream'
import logger from '../../logger'
import config from '../config'
import { CaseLoad } from '../@types/prisonApi/types'

export default class PrisonApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prison API', config.apis.prisonApi, logger, authenticationClient)
  }

  async getPrisonerImage(nomsId: string, token: string): Promise<Readable> {
    try {
      return await this.stream(
        {
          path: `/api/bookings/offenderNo/${nomsId}/image/data`,
        },
        asUser(token),
      )
    } catch (error) {
      return error
    }
  }

  async getUsersCaseloads(token: string): Promise<CaseLoad[]> {
    return this.get({ path: `/api/users/me/caseLoads` }, asUser(token)) as Promise<CaseLoad[]>
  }
}
