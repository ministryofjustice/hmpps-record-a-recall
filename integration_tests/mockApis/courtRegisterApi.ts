import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: '/courts/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubGetCourtsByIds: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPathPattern: '/courts/courts/id/multiple.*',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            courtId: 'ACCRYC',
            courtName: 'Accrington Youth Court',
            courtDescription: 'Accrington Youth Court',
            type: {
              courtType: 'COU',
              courtName: 'County Court/County Divorce Ct',
            },
            active: true,
            buildings: [
              {
                id: 10000,
                courtId: 'ACCRYC',
                subCode: 'AAABBB',
                addressLine1: 'Crown House',
                addressLine2: '452 West Street',
                addressLine3: 'Swansea',
                addressLine4: 'West Cross',
                addressLine5: 'South Glamorgan',
                postcode: 'SA3 4HT',
                contacts: [
                  {
                    id: 10000,
                    courtId: 'ACCRYC',
                    buildingId: 12312,
                    type: 'TEL',
                    detail: '555 55555',
                  },
                ],
                active: true,
              },
            ],
          },
          {
            courtId: 'STHHPM',
            courtName: 'Southampton Magistrate Court',
            courtDescription: 'Southampton Magistrate Court',
            type: {
              courtType: 'MAG',
              courtName: 'Magistrate',
            },
            active: true,
            buildings: [],
          },
          {
            courtId: 'BCC',
            courtName: 'Birmingham Crown Court',
            courtDescription: 'Birmingham Crown Court',
            type: {
              courtType: 'CRW',
              courtName: 'Crown',
            },
            active: true,
            buildings: [],
          },
          {
            courtId: 'ABRYCT',
            courtName: 'Aberystwyth Crown Court',
            courtDescription: 'Aberystwyth Crown Court',
            type: {
              courtType: 'CRW',
              courtName: 'Crown',
            },
            active: true,
            buildings: [],
          },
          {
            courtId: 'ABDRCT',
            courtName: 'Aberdeen Crown Court',
            courtDescription: 'Aberdeen Crown Court',
            type: {
              courtType: 'CRW',
              courtName: 'Crown',
            },
            active: true,
            buildings: [],
          },
          {
  courtId: 'BNGRMC',
  courtName: 'Bangor Magistrates Court',
  courtDescription: 'Bangor Magistrates Court',
  type: {
    courtType: 'MAG',
    courtName: 'Magistrates',
  },
  active: true,
  buildings: [],
},

        ],
      },
    })
  },
}
