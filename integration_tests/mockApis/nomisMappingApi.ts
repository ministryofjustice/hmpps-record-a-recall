import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubNomisMapping: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: '/nomis-mapping-service-api/api/sentences/nomis',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            nomisSentenceId: {
              nomisSentenceSequence: 123,
              nomisBookingId: 456,
            },
            dpsSentenceId: 'dpsSentenceId1',
          },
          {
            nomisSentenceId: {
              nomisSentenceSequence: 789,
              nomisBookingId: 111,
            },
            dpsSentenceId: 'dpsSentence2',
          },
        ],
      },
    })
  },
}
