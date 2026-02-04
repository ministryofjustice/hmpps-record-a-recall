import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: '/prison-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubGetPrisonerImage: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPathPattern: '/prison-api/api/bookings/offenderNo/BA1234AB/image/data',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
        base64Body:
          'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEW10NBjBBbqAAAAH0lEQVRoge3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAvg0hAAABmmDh1QAAAABJRU5ErkJggg==',
      },
    })
  },
  stubGetPrisonerDetails: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/offenders/BA1234AB',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          offenderNo: 'A1234AB',
          bookingId: '1234',
          firstName: 'Marvin',
          lastName: 'Haggler',
          dateOfBirth: '1965-02-03',
          agencyId: 'MDI',
          imprisonmentStatusDescription: 'Some Status',
          assignedLivingUnit: {
            agencyName: 'Foo Prison (HMP)',
            description: 'D-2-003',
          },
        },
      },
    })
  },

  stubGetPrisonerDetailsTwo: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/offenders/BA1234AB',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          offenderNo: 'BA1234AB',
          bookingId: '1234',
          firstName: 'Mary',
          lastName: 'Jones',
          dateOfBirth: '1965-02-03',
          agencyId: 'MDI',
          imprisonmentStatusDescription: 'Some Status',
          assignedLivingUnit: {
            agencyName: 'Foo Prison (HMP)',
            description: 'D-2-003',
          },
        },
      },
    })
  },

  stubGetSentencesAndOffences: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/offender-sentences/booking/1234/sentences-and-offences',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            terms: [
              {
                years: 3,
              },
            ],
            sentenceCalculationType: 'ADIMP',
            sentenceTypeDescription: 'SDS Standard Sentence',
            caseSequence: 1,
            lineSequence: 1,
            caseReference: 'ABC123',
            sentenceSequence: 1,
            sentenceStatus: 'A',
            offences: [
              {
                offenceEndDate: '2021-02-03',
                offenceCode: 'abc',
                offenderChargeId: 111,
                offenceDescription: 'Doing a crime',
              },
            ],
          },
          {
            terms: [
              {
                years: 2,
              },
            ],
            sentenceCalculationType: 'ADIMP',
            caseSequence: 2,
            lineSequence: 2,
            caseReference: 'ABC234',
            sentenceSequence: 2,
            consecutiveToSequence: 1,
            sentenceStatus: 'A',
            sentenceTypeDescription: 'SDS Standard Sentence',
            offences: [
              {
                offenceEndDate: '2021-02-05',
                offenceCode: 'def',
                offenderChargeId: 222,
                offenceDescription: 'Doing another crime',
              },
            ],
          },
          {
            terms: [
              {
                years: 10,
              },
            ],
            sentenceCalculationType: 'ADIMP',
            caseSequence: 2,
            lineSequence: 3,
            caseReference: 'ABC345',
            sentenceSequence: 3,
            consecutiveToSequence: 1,
            sentenceStatus: 'I',
            sentenceTypeDescription: 'SDS Standard Sentence',
            offences: [{ offenceEndDate: '2021-02-05', offenceDescription: 'Doing a crime' }],
          },
        ],
      },
    })
  },
  stubGetUserCaseloads: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/users/me/caseLoads',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            caseLoadId: 'MDI',
          },
        ],
      },
    })
  },
}
