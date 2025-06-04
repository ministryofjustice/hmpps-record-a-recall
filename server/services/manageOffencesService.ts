
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'
import ManageOffencesApiClient from '../api/manageOffencesApiClient'

export default class ManageOffencesService {

  async getOffencesByCodes(offenceCodes: string[], token: string): Promise<Offence[]> {
    return new ManageOffencesApiClient(token).getOffencesByCodes(offenceCodes)
  }

  async getOffenceMap(offenceCodes: string[], token: string) {
    console.log('getOffenceMap - service')
    let offenceMap = {}
    const toSearchCodes = offenceCodes.filter(offenceCode => offenceCode)
    if (toSearchCodes.length) {
        console.log('something here -service')
      const offences = await this.getOffencesByCodes(toSearchCodes, token)
      console.log('after awiut -service)')
      offenceMap = Object.fromEntries(offences.map(offence => [offence.code, offence.description]))
    }
    return offenceMap
  }
}
