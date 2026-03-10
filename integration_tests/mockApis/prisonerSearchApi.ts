import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: '/prison-search-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubPrisonerSearch: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-search-api/prisoner/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          prisonerNumber: 'A0164ED',
          bookingId: '1233536',
          bookNumber: '70229A',
          firstName: 'VANILLA',
          lastName: 'RECALLS',
          dateOfBirth: '1980-01-01',
          gender: 'Male',
          youthOffender: false,
          personalCareNeeds: [],
          languages: [],
          militaryRecord: false,
          status: 'ACTIVE IN',
          lastMovementTypeCode: 'ADM',
          lastMovementReasonCode: 'N',
          inOutStatus: 'IN',
          prisonId: 'KMI',
          prisonName: 'Kirkham (HMP)',
          lastPrisonId: 'KMI',
          cellLocation: 'RECP',
          aliases: [],
          alerts: [],
          legalStatus: 'SENTENCED',
          imprisonmentStatus: 'ADIMP_ORA20',
          imprisonmentStatusDescription: 'ORA 2020 Standard Determinate Sentence',
          convictedStatus: 'Convicted',
          mostSeriousOffence: 'Affray',
          recall: false,
          indeterminateSentence: false,
          sentenceStartDate: '2025-04-01',
          receptionDate: '2022-01-01',
          lastAdmissionDate: '2022-01-01',
          locationDescription: 'Kirkham (HMP)',
          restrictedPatient: false,
          currentIncentive: {
            level: {
              code: 'STD',
              description: 'Standard',
            },
            dateTime: '2026-02-11T12:08:49',
            nextReviewDate: '2022-04-01',
          },
          addresses: [],
          emailAddresses: [],
          phoneNumbers: [],
          identifiers: [],
          allConvictedOffences: [
            {
              statuteCode: 'PU86',
              offenceCode: 'PU86003',
              offenceDescription: 'Affray',
              offenceDate: '2020-01-01',
              latestBooking: true,
              sentenceStartDate: '2025-04-01',
              primarySentence: true,
            },
          ],
        },
      },
    })
  },
}
