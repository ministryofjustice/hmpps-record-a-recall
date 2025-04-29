import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubSearchCourtCases: ({ sortBy = 'desc' }: { sortBy: string }): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/court-case/search',
        queryParameters: {
          prisonerId: {
            equalTo: 'A1234AB',
          },
          sort: {
            equalTo: `latestCourtAppearance_appearanceDate,${sortBy}`,
          },
        },
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          totalPages: 0,
          totalElements: 1,
          size: 20,
          content: [
            {
              prisonerId: 'A1234AB',
              courtCaseUuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              latestAppearance: {
                appearanceUuid: 'a6400fd8-aef4-4567-b18c-d1f452651933',
                outcome: {
                  outcomeUuid: '6da892fa-d85e-44de-95d4-a7f06c3a2dcb',
                  outcomeName: 'Remanded in custody',
                  nomisCode: '3452',
                  outcomeType: 'REMAND',
                  displayOrder: 10,
                },
                courtCode: 'ACCRYC',
                status: 'ACTIVE',
                warrantType: 'REMAND',
                courtCaseReference: 'C894623',
                appearanceDate: '2023-12-15',
                nextCourtAppearance: {
                  appearanceDate: '2024-12-15',
                  appearanceTime: '10:30:00.000000000',
                  courtCode: 'Birmingham Crown Court',
                  appearanceType: {
                    appearanceTypeUuid: '63e8fce0-033c-46ad-9edf-391b802d547a',
                    description: 'Court appearance',
                    displayOrder: 10,
                  },
                },
                charges: [
                  {
                    chargeUuid: '71bb9f7e-971c-4c34-9a33-43478baee74f',
                    offenceCode: 'PS90037',
                    offenceStartDate: '2023-12-15',
                    outcome: {
                      outcomeUuid: '85ffc6bf-6a2c-4f2b-8db8-5b466b602537',
                      outcomeName: 'Remanded in custody',
                      nomisCode: '3452',
                      outcomeType: 'REMAND',
                      displayOrder: 10,
                      isSubList: false,
                      dispositionCode: 'INTERIM',
                    },
                  },
                  {
                    chargeUuid: '9b622879-8191-4a7f-9fe8-71b680417220',
                    offenceCode: 'PS90037',
                    outcome: {
                      outcomeUuid: '92e69bb5-9769-478b-9ee6-77c91808d9af',
                      outcomeName: 'Commit to Crown Court for trial in custody',
                      nomisCode: '7869',
                      outcomeType: 'REMAND',
                      displayOrder: 20,
                      isSubList: false,
                      dispositionCode: 'INTERIM',
                    },
                  },
                ],
              },
              appearances: [
                {
                  appearanceUuid: 'a6400fd8-aef4-4567-b18c-d1f452651933',
                  outcome: {
                    outcomeUuid: '6da892fa-d85e-44de-95d4-a7f06c3a2dcb',
                    outcomeName: 'Remanded in custody',
                    nomisCode: '3452',
                    outcomeType: 'REMAND',
                    displayOrder: 10,
                  },
                  courtCode: 'ACCRYC',
                  courtCaseReference: 'C894623',
                  warrantType: 'REMAND',
                  appearanceDate: '2023-12-15',
                  nextCourtAppearance: {
                    appearanceDate: '2024-12-15',
                    appearanceTime: '10:30:00.000000000',
                    courtCode: 'Birmingham Crown Court',
                    appearanceType: {
                      appearanceTypeUuid: '63e8fce0-033c-46ad-9edf-391b802d547a',
                      description: 'Court appearance',
                      displayOrder: 10,
                    },
                  },
                  charges: [
                    {
                      chargeUuid: '71bb9f7e-971c-4c34-9a33-43478baee74f',
                      offenceCode: 'PS90037',
                      offenceStartDate: '2023-12-15',
                      outcome: {
                        outcomeUuid: '85ffc6bf-6a2c-4f2b-8db8-5b466b602537',
                        outcomeName: 'Remanded in custody',
                        nomisCode: '3452',
                        outcomeType: 'REMAND',
                        displayOrder: 10,
                        isSubList: false,
                        dispositionCode: 'INTERIM',
                      },
                    },
                  ],
                },
                {
                  appearanceUuid: '5b4cbea0-edd3-4bac-9485-b3e3cd46ad77',
                  outcome: {
                    outcomeUuid: '7fd9efee-200e-4579-a766-e6bf9a499096',
                    outcomeName: 'Lie on file',
                    nomisCode: '7863',
                    outcomeType: 'REMAND',
                    displayOrder: 20,
                  },
                  courtCode: 'ACCRYC',
                  warrantType: 'REMAND',
                  courtCaseReference: 'F23325',
                  appearanceDate: '2022-10-15',
                  nextCourtAppearance: {
                    appearanceDate: '2023-12-15',
                    courtCode: 'Birmingham Crown Court',
                    appearanceType: {
                      appearanceTypeUuid: '63e8fce0-033c-46ad-9edf-391b802d547a',
                      description: 'Court appearance',
                      displayOrder: 10,
                    },
                  },
                  charges: [
                    {
                      chargeUuid: '9056c1f3-b090-4d1e-bc6e-4f66ebed2ed5',
                      offenceCode: 'PS90037',
                      offenceStartDate: '2023-12-15',
                      outcome: {
                        outcomeUuid: '66032e17-977a-40f9-b634-1bc2b45e874d',
                        outcomeName: 'Lie on file',
                        nomisCode: '7863',
                        outcomeType: 'REMAND',
                        displayOrder: 20,
                        isSubList: true,
                        dispositionCode: 'FINAL',
                      },
                    },
                  ],
                },
              ],
              legacyData: {
                caseReferences: [
                  {
                    offenderCaseReference: 'C894623',
                    updatedDate: '2023-12-15T10:15:30',
                  },
                  {
                    offenderCaseReference: 'F23325',
                    updatedDate: '2022-10-15T10:15:30',
                  },
                  {
                    offenderCaseReference: 'J39596',
                    updatedDate: '2021-10-15T10:15:30',
                  },
                ],
              },
            },
            {
              prisonerId: 'A1234AB',
              courtCaseUuid: 'd316d5b7-022f-40e5-98ab-aebe8ac4abf4',
              appearances: [],
              status: 'INACTIVE',
            },
            {
              prisonerId: 'A1234AB',
              courtCaseUuid: '84ab3dc4-7bd7-4b14-a1ae-6434f7e2cc8b',
              status: 'ACTIVE',
              latestAppearance: {
                appearanceUuid: 'd48ce605-8f96-4ad7-93fe-5688986599e2',
                legacyData: {
                  eventId: '1',
                  caseId: '1',
                  postedDate: '10-10-2015',
                  nomisOutcomeCode: '5789714',
                  outcomeDescription: 'A Nomis outcome',
                },
                courtCode: 'ACCRYC',
                warrantType: 'REMAND',
                courtCaseReference: 'C894623',
                appearanceDate: '2023-12-15',
                nextCourtAppearance: {
                  appearanceDate: '2024-12-15',
                  courtCode: 'Birmingham Crown Court',
                  appearanceType: {
                    appearanceTypeUuid: '63e8fce0-033c-46ad-9edf-391b802d547a',
                    description: 'Court appearance',
                    displayOrder: 10,
                  },
                },
                charges: [
                  {
                    chargeUuid: 'b5fbb9be-5773-47f8-9091-dcc9c154a7d5',
                    offenceCode: 'PS90037',
                    offenceStartDate: '2023-12-15',
                    legacyData: {
                      offenderChargeId: '1',
                      bookingId: '1',
                      postedDate: '10-10-2015',
                      nomisOutcomeCode: '5789714',
                      outcomeDescription: 'A Nomis outcome',
                      outcomeDispositionCode: 'INTERIM',
                    },
                  },
                ],
              },
              appearances: [
                {
                  appearanceUuid: 'd48ce605-8f96-4ad7-93fe-5688986599e2',
                  legacyData: {
                    eventId: '1',
                    caseId: '1',
                    postedDate: '10-10-2015',
                    nomisOutcomeCode: '5789714',
                    outcomeDescription: 'A Nomis outcome',
                  },
                  courtCode: 'ACCRYC',
                  courtCaseReference: 'C894623',
                  warrantType: 'REMAND',
                  appearanceDate: '2023-12-15',
                  nextCourtAppearance: {
                    appearanceDate: '2024-12-15',
                    courtCode: 'Birmingham Crown Court',
                    appearanceType: {
                      appearanceTypeUuid: '63e8fce0-033c-46ad-9edf-391b802d547a',
                      description: 'Court appearance',
                      displayOrder: 10,
                    },
                  },
                  charges: [
                    {
                      chargeUuid: 'b5fbb9be-5773-47f8-9091-dcc9c154a7d5',
                      offenceCode: 'PS90037',
                      offenceStartDate: '2023-12-15',
                      legacyData: {
                        offenderChargeId: '1',
                        bookingId: '1',
                        postedDate: '10-10-2015',
                        nomisOutcomeCode: '5789714',
                        outcomeDescription: 'A Nomis outcome',
                        outcomeDispositionCode: 'INTERIM',
                      },
                    },
                  ],
                },
              ],
            },
            {
              prisonerId: 'A1234AB',
              courtCaseUuid: '261911e2-6346-42e0-b025-a806048f4d04',
              status: 'ACTIVE',
              latestAppearance: {
                appearanceUuid: 'ff6e0dbf-f38a-4131-9c61-ad529188412f',
                lifetimeUuid: 'a19d8229-3098-4fc1-93a8-c19b4d247541',
                outcome: {
                  outcomeUuid: '6fa97bb8-02f8-40ec-8758-fcb16bf315c6',
                  outcomeName: 'Imprisonment',
                  nomisCode: '1002',
                  outcomeType: 'SENTENCING',
                  displayOrder: 10,
                  relatedChargeOutcomeUuid: 'f4617346-3b8e-467b-acc4-a4fab809ed3b',
                  isSubList: false,
                },
                courtCode: 'ACCRYC',
                courtCaseReference: 'XX1234',
                appearanceDate: '2024-01-23',
                warrantId: null,
                warrantType: 'SENTENCING',
                taggedBail: null,
                nextCourtAppearance: null,
                charges: [
                  {
                    chargeUuid: 'aeb5ba2e-0bf5-444d-b540-4739012cd7a5',
                    lifetimeUuid: 'bf831234-41af-4ba6-b7d0-bd36b02dd5fa',
                    offenceCode: 'PS90037',
                    offenceStartDate: '2023-10-11',
                    offenceEndDate: null,
                    outcome: {
                      outcomeUuid: 'f4617346-3b8e-467b-acc4-a4fab809ed3b',
                      outcomeName: 'Imprisonment',
                      nomisCode: '1002',
                      outcomeType: 'SENTENCING',
                      displayOrder: 10,
                      isSubList: false,
                      dispositionCode: 'FINAL',
                    },
                    terrorRelated: false,
                    sentence: {
                      sentenceUuid: '29fa8c7f-7ba1-4033-ac4d-83ff0c125a45',
                      sentenceLifetimeUuid: '34511c2a-3daf-4d07-a8e2-47046c12967f',
                      chargeNumber: '1',
                      periodLengths: [
                        {
                          years: 1,
                          months: null,
                          weeks: null,
                          days: null,
                          periodOrder: 'years',
                          periodLengthType: 'TARIFF_LENGTH',
                          legacyData: null,
                        },
                      ],
                      sentenceServeType: 'FORTHWITH',
                      consecutiveToChargeNumber: null,
                      sentenceType: {
                        sentenceTypeUuid: '43370123-38b2-4f6c-89d7-d5e197d44f09',
                        description: 'Automatic Life',
                        classification: 'INDETERMINATE',
                        hintText: null,
                      },
                      convictionDate: '2023-10-12',
                      fineAmount: null,
                      legacyData: null,
                    },
                    legacyData: null,
                  },
                ],
                overallSentenceLength: {
                  years: 1,
                  months: null,
                  weeks: null,
                  days: null,
                  periodOrder: 'years',
                  periodLengthType: 'OVERALL_SENTENCE_LENGTH',
                  legacyData: null,
                },
                overallConvictionDate: '2023-10-23',
                legacyData: null,
              },
              appearances: [
                {
                  appearanceUuid: 'ff6e0dbf-f38a-4131-9c61-ad529188412f',
                  lifetimeUuid: 'a19d8229-3098-4fc1-93a8-c19b4d247541',
                  outcome: {
                    outcomeUuid: '6fa97bb8-02f8-40ec-8758-fcb16bf315c6',
                    outcomeName: 'Imprisonment',
                    nomisCode: '1002',
                    outcomeType: 'SENTENCING',
                    displayOrder: 10,
                    relatedChargeOutcomeUuid: 'f4617346-3b8e-467b-acc4-a4fab809ed3b',
                    isSubList: false,
                  },
                  courtCode: 'ACCRYC',
                  courtCaseReference: 'XX1234',
                  appearanceDate: '2024-01-23',
                  warrantId: null,
                  warrantType: 'SENTENCING',
                  taggedBail: null,
                  nextCourtAppearance: null,
                  charges: [
                    {
                      chargeUuid: 'aeb5ba2e-0bf5-444d-b540-4739012cd7a5',
                      lifetimeUuid: 'bf831234-41af-4ba6-b7d0-bd36b02dd5fa',
                      offenceCode: 'PS90037',
                      offenceStartDate: '2023-10-11',
                      offenceEndDate: null,
                      outcome: {
                        outcomeUuid: 'f4617346-3b8e-467b-acc4-a4fab809ed3b',
                        outcomeName: 'Imprisonment',
                        nomisCode: '1002',
                        outcomeType: 'SENTENCING',
                        displayOrder: 10,
                        isSubList: false,
                        dispositionCode: 'FINAL',
                      },
                      terrorRelated: false,
                      sentence: {
                        sentenceUuid: '29fa8c7f-7ba1-4033-ac4d-83ff0c125a45',
                        sentenceLifetimeUuid: '34511c2a-3daf-4d07-a8e2-47046c12967f',
                        chargeNumber: '1',
                        periodLengths: [
                          {
                            years: 1,
                            months: null,
                            weeks: null,
                            days: null,
                            periodOrder: 'years',
                            periodLengthType: 'TARIFF_LENGTH',
                            legacyData: null,
                          },
                        ],
                        sentenceServeType: 'FORTHWITH',
                        consecutiveToChargeNumber: null,
                        sentenceType: {
                          sentenceTypeUuid: '43370123-38b2-4f6c-89d7-d5e197d44f09',
                          description: 'Automatic Life',
                          classification: 'INDETERMINATE',
                          hintText: null,
                        },
                        convictionDate: '2023-10-12',
                        fineAmount: null,
                        legacyData: null,
                      },
                      legacyData: null,
                    },
                  ],
                  overallSentenceLength: {
                    years: 1,
                    months: null,
                    weeks: null,
                    days: null,
                    periodOrder: 'years',
                    periodLengthType: 'OVERALL_SENTENCE_LENGTH',
                    legacyData: null,
                  },
                  overallConvictionDate: '2023-10-23',
                  legacyData: null,
                },
              ],
              legacyData: {
                caseReferences: [
                  {
                    updatedDate: '2024-10-10T08:47:37Z',
                    offenderCaseReference: 'XX1234',
                  },
                  {
                    updatedDate: '2024-10-09T13:40:56Z',
                    offenderCaseReference: 'YY1234',
                  },
                ],
              },
              draftAppearances: [],
            },
          ],
          number: 0,
          sort: {
            empty: true,
            sorted: true,
            unsorted: true,
          },
          numberOfElements: 0,
          pageable: {
            offset: 0,
            sort: {
              empty: true,
              sorted: true,
              unsorted: true,
            },
            pageSize: 0,
            pageNumber: 0,
            paged: true,
            unpaged: true,
          },
          last: true,
          first: true,
          empty: true,
        },
      },
    })
  },
  stubRecallPerson: ({ sortBy = 'desc' }: { sortBy: string }): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A1234AB',
        queryParameters: {
          prisonerId: {
            equalTo: 'A1234AB',
          },
          sort: {
            equalTo: `latestCourtAppearance_appearanceDate,${sortBy}`,
          },
        },
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: 
           [
            { 
            recallUuid: 'ABC',
            prisonerId: 'A1234AB',
            revocationDate: '2018-03-03T00:00:00.000Z',
            returnToCustodyDate: null,
            recallType: {
              code: 'LR',
              description: 'Standard',
              fixedTerm: false,
            },
            courtCaseIds: []
            }
           ]
        
      }
    }
    )
  },
  stubRecallRecorded: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: '/remand-and-sentencing-api/recall',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          recallUuid: 'ABC',
        },
      },
    })
  }
}
