import { HmppsAuthClient } from '../data'
import CourtRegisterApiClient from '../api/courtRegisterApiClient'
import { Court } from '../@types/courtRegisterApi/courtRegisterTypes'

export default class CourtCaseService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getCourtNames(courtIds: string[], username: string): Promise<Map<string, string>> {
    const details: Court[] = await (await this.getApiClient(username)).getCourtDetails(courtIds.join(','))
    const courtMap = new Map()
    details.forEach((c: Court) => {
      courtMap.set(c.courtId, c.courtName)
    })
    return courtMap
  }

  private async getApiClient(username: string): Promise<CourtRegisterApiClient> {
    return new CourtRegisterApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
