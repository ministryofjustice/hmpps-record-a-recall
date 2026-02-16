import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: '/court-cases-release-dates-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  //   return stubFor({
  //     request: {
  //       method: 'GET',
  //       urlPattern: '/court-cases-release-dates-api/service-definitions/prisoner/BA1234AB',
  //     },
  //     response: {
  //       status: 200,
  //       headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  //       jsonBody: {
  //         services: {
  //           overview: {
  //             href: 'https://court-cases-release-dates-dev.hmpps.service.justice.gov.uk/prisoner/A6684EC/overview',
  //             text: 'Overview',
  //             thingsToDo: {
  //               things: [],
  //               count: 0,
  //             },
  //           },
  //           adjustments: {
  //             href: 'https://adjustments-dev.hmpps.service.justice.gov.uk/A6684EC',
  //             text: 'Adjustments',
  //             thingsToDo: {
  //               things: [],
  //               count: 0,
  //             },
  //           },
  //           releaseDates: {
  //             href: 'https://calculate-release-dates-dev.hmpps.service.justice.gov.uk?prisonId=A6684EC',
  //             text: 'Release dates and calculations',
  //             thingsToDo: {
  //               things: [],
  //               count: 0,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   })
  // },
  getServiceDefinitions: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/court-cases-release-dates-api/service-definitions/prisoner/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          services: {
            overview: {
              href: 'https://court-cases-release-dates-dev.hmpps.service.justice.gov.uk/prisoner/A0164ED/overview',
              text: 'Overview',
              thingsToDo: {
                things: [],
                count: 0,
              },
            },
            adjustments: {
              href: 'https://adjustments-dev.hmpps.service.justice.gov.uk/A0164ED',
              text: 'Adjustments',
              thingsToDo: {
                things: [],
                count: 0,
              },
            },
            releaseDates: {
              href: 'https://calculate-release-dates-dev.hmpps.service.justice.gov.uk?prisonId=A0164ED',
              text: 'Release dates and calculations',
              thingsToDo: {
                things: [
                  {
                    title: 'Calculation required',
                    message:
                      'Some information has changed. Check that all information is up to date then calculate release dates.',
                    buttonText: 'Calculate release dates',
                    buttonHref:
                      'https://calculate-release-dates-dev.hmpps.service.justice.gov.uk/calculation/A0164ED/reason',
                    type: 'CALCULATION_REQUIRED',
                  },
                ],
                count: 1,
              },
            },
          },
        },
      },
    })
  },
}
