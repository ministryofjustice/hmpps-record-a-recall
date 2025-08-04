import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  getOffencesByCodes: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/manage-offences-api/offences/code/multiple?.*',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [{ code: '123', description: 'Doing a crime' }],
      },
    })
  },
}
