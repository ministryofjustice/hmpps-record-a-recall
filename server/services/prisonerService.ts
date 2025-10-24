import { Readable } from 'stream'
import PrisonApiClient from '../data/prisonApiClient'
import { CaseLoad } from '../@types/prisonApi/types'

export default class PrisonerService {
  constructor(private readonly prisonApiClient: PrisonApiClient) {}

  getPrisonerImage(nomsId: string, token: string): Promise<Readable> {
    return this.prisonApiClient.getPrisonerImage(nomsId, token)
  }

  async getUsersCaseloads(token: string): Promise<CaseLoad[]> {
    return this.prisonApiClient.getUsersCaseloads(token)
  }
}
