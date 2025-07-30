import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'
import ManageOffencesApiClient from '../api/manageOffencesApiClient'

export default class ManageOffencesService {
  async getOffencesByCodes(offenceCodes: string[], token: string): Promise<Offence[]> {
    return new ManageOffencesApiClient(token).getOffencesByCodes(offenceCodes)
  }


  async getOffenceMap(offenceCodes: string[], token: string) {
  let offenceMap = {}
  const toSearchCodes = offenceCodes.filter(offenceCode => offenceCode)

  if (toSearchCodes.length) {
    const offences = await this.getOffencesByCodes(toSearchCodes, token)

    offenceMap = Object.fromEntries(offences.map(offence => [offence.code, offence.description]))

  } else {
    console.log('[ManageOffencesService] No valid offence codes provided')
  }

  return offenceMap
}

}
