import { Readable } from 'stream'
import logger from '../../logger'
import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'

export default class PrisonApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prison API', config.apis.prisonApi, logger, authenticationClient)
  }

  async getPrisonerImage(nomsId: string): Promise<Readable> {
    try {
      return await this.stream(
        {
          path: `/api/bookings/offenderNo/${nomsId}/image/data`,
        },
        asSystem(),
      )
    } catch (error) {
      return error
    }
  }
}
