import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/court-cases-release-dates-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  getServiceDefinitions: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/court-cases-release-dates-api/service-definitions/prisoner/BA1234AB',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          services: {
            overview: {
              href: 'https://court-cases-release-dates-dev.hmpps.service.justice.gov.uk/prisoner/A6684EC/overview',
              text: 'Overview',
              thingsToDo: {
                things: [],
                count: 0,
              },
            },
            adjustments: {
              href: 'https://adjustments-dev.hmpps.service.justice.gov.uk/A6684EC',
              text: 'Adjustments',
              thingsToDo: {
                things: [],
                count: 0,
              },
            },
            releaseDates: {
              href: 'https://calculate-release-dates-dev.hmpps.service.justice.gov.uk?prisonId=A6684EC',
              text: 'Release dates and calculations',
              thingsToDo: {
                things: [],
                count: 0,
              },
            },
          },
        },
      },
    })
  },
}
