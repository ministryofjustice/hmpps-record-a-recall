import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'

export default class PrisonRegisterService {
  constructor(private readonly prisonRegisterApiClient: PrisonRegisterApiClient) {}

  getPrisonNames(prisonIds: string[], username: string): Promise<Prison[]> {
    return this.prisonRegisterApiClient.getPrisonNames(prisonIds, username)
  }
}
