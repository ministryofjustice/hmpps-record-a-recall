import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  getNoAdjustmentsForPrisoner: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/adjustments-api/adjustments?.*',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [],
      },
    })
  },
}
