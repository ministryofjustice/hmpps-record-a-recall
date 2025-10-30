import { CcrdServiceDefinitions } from '../@types/courtCasesReleaseDatesApi/types'
import CourtCasesReleaseDatesApiClient from '../data/courtCasesReleaseDatesApiClient'

export default class CourtCasesReleaseDatesService {
  constructor(private readonly courtCasesReleaseDatesApiClient: CourtCasesReleaseDatesApiClient) {}

  public async getServiceDefinitions(prisonerId: string, token: string): Promise<CcrdServiceDefinitions> {
    return this.courtCasesReleaseDatesApiClient.getServiceDefinitions(prisonerId, token)
  }
}
