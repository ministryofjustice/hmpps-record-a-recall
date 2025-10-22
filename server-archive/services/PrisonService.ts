import { HmppsAuthClient } from '../data'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import PrisonRegisterApiClient from '../api/prisonRegisterApiClient'

export default class PrisonService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonName(prisonId: string, username: string) {
    return this.getPrisonNames([prisonId], username)
  }

  async getPrisonNames(prisonIds: string[], username: string): Promise<Map<string, string>> {
    if (!prisonIds || prisonIds.length === 0) {
      return new Map()
    }
    const details: Prison[] = await (await this.getApiClient(username)).getPrisonsDetails(prisonIds)
    const prisonMap = new Map()
    details.forEach((p: Prison) => {
      prisonMap.set(p.prisonId, p.prisonName)
    })
    return prisonMap
  }

  private async getApiClient(username: string): Promise<PrisonRegisterApiClient> {
    return new PrisonRegisterApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
