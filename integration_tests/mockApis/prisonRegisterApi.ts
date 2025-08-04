import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  getPrisonsByPrisonIds: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPattern: '/prison-register-api/prisons/prisonsByIds',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [{ prisonId: 'MDI', prisonName: 'HMP Leeds' }],
      },
    })
  },
}
