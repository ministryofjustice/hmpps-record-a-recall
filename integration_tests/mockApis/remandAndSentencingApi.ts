import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubHasSentences: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPathPattern: '/remand-and-sentencing-api/sentence/has-sentences/[A-Z0-9]+',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { hasSentences: true },
      },
    }),
  stubSearchCourtCases: ({ prisonerId = 'A0164ED' }: { prisonerId?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          totalCases: 1,
          cases: [
            {
              courtCaseUuid: '7dab3958-8a3d-45f4-ab69-492f4b620235',
              reference: 'AB28935235',
              courtCode: 'BNGRMC',
              status: 'ACTIVE',
              isSentenced: true,
              appearanceDate: '2025-04-01',
              firstDayInCustody: '2025-04-01',
              courtName: 'Bangor Mc',
              sentences: [
                {
                  sentenceUuid: '52ba27a7-f37b-4d1f-b3d8-af9e27a4ec6a',
                  offenceCode: 'PU86003',
                  offenceStartDate: '2020-01-01',
                  offenceEndDate: null,
                  outcome: 'Imprisonment',
                  sentenceType: 'ORA SDS (Offender rehabilitation act standard determinate sentence)',
                  classification: 'STANDARD',
                  systemOfRecord: 'RAS',
                  fineAmount: null,
                  periodLengths: [
                    {
                      years: 1,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'SENTENCE_LENGTH',
                      legacyData: null,
                      periodLengthUuid: '12d1f1c0-9dea-49a5-9094-6bcfe84c1a7f',
                    },
                  ],
                  convictionDate: '2025-04-01',
                  chargeLegacyData: null,
                  countNumber: '1',
                  lineNumber: '1',
                  sentenceServeType: 'FORTHWITH',
                  sentenceLegacyData: {
                    sentenceCalcType: null,
                    sentenceCategory: null,
                    sentenceTypeDesc: null,
                    postedDate: '2026-02-11T12:11:37.504014',
                    active: null,
                    nomisLineReference: '1',
                    bookingId: 1233536,
                  },
                  outcomeDescription: 'Imprisonment',
                  isRecallable: true,
                  sentenceTypeUuid: 'e138374d-810f-4718-a81a-1c9d4745031e',
                  sentenceDate: '2025-04-01',
                },
              ],
              recallableSentences: [
                {
                  sentenceUuid: '52ba27a7-f37b-4d1f-b3d8-af9e27a4ec6a',
                  offenceCode: 'PU86003',
                  offenceStartDate: '2020-01-01',
                  offenceEndDate: null,
                  outcome: 'Imprisonment',
                  sentenceType: 'ORA SDS (Offender rehabilitation act standard determinate sentence)',
                  classification: 'STANDARD',
                  systemOfRecord: 'RAS',
                  fineAmount: null,
                  periodLengths: [
                    {
                      years: 1,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'SENTENCE_LENGTH',
                      legacyData: null,
                      periodLengthUuid: '12d1f1c0-9dea-49a5-9094-6bcfe84c1a7f',
                    },
                  ],
                  convictionDate: '2025-04-01',
                  chargeLegacyData: null,
                  countNumber: '1',
                  lineNumber: '1',
                  sentenceServeType: 'FORTHWITH',
                  sentenceLegacyData: {
                    sentenceCalcType: null,
                    sentenceCategory: null,
                    sentenceTypeDesc: null,
                    postedDate: '2026-02-11T12:11:37.504014',
                    active: null,
                    nomisLineReference: '1',
                    bookingId: 1233536,
                  },
                  outcomeDescription: 'Imprisonment',
                  isRecallable: true,
                  sentenceTypeUuid: 'e138374d-810f-4718-a81a-1c9d4745031e',
                  sentenceDate: '2025-04-01',
                  offenceDescription: 'Affray',
                },
              ],
              nonRecallableSentences: [],
            },
          ],
        },
      },
    })
  },

  stubSearchCourtCasesWithBothSDS: ({ prisonerId = 'A0164ED' }: { prisonerId?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPathPattern: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases.*`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          totalCases: 2,
          cases: [
            {
              courtCaseUuid: 'bbb25c4f-81d7-4e18-ad84-0646a54c8a3a',
              reference: '',
              courtCode: 'ABRYCT',
              date: '2024-06-12',
              status: 'ACTIVE',
              isSentenced: true,
              sentences: [
                {
                  sentenceUuid: 'a669b3a0-1ddc-4f4d-80b8-468b4ea529f8',
                  offenceCode: 'HA04005',
                  sentenceType: 'SDS (Standard Determinate Sentence)',
                  classification: 'STANDARD',
                  systemOfRecord: 'RAS',
                  periodLengths: [
                    {
                      years: 1,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'CUSTODIAL_TERM',
                      legacyData: null,
                      periodLengthUuid: 'fc003e29-ede9-4302-b970-27ab3b6a11e4',
                    },
                    {
                      years: 5,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'LICENCE_PERIOD',
                      legacyData: null,
                      periodLengthUuid: '8c5ac995-db1e-4cdf-9acd-56aa6abc99f6',
                    },
                  ],
                  isRecallable: true,
                },
              ],
            },
            {
              courtCaseUuid: '4eb87827-f43e-48bf-80df-86c7205b581c',
              reference: '',
              courtCode: 'ABDRCT',
              date: '2024-02-12',
              status: 'ACTIVE',
              isSentenced: true,
              sentences: [
                {
                  sentenceUuid: 'b1515f6d-b685-46be-b8a7-3f1f87cca976',
                  offenceCode: 'COML017B',
                  sentenceType: 'SDS (Standard Determinate Sentence)',
                  classification: 'STANDARD',
                  systemOfRecord: 'RAS',
                  periodLengths: [
                    {
                      years: 2,
                      months: 11,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'SENTENCE_LENGTH',
                      legacyData: null,
                      periodLengthUuid: 'e7b188ef-066e-40be-b59a-d71f2e109ff9',
                    },
                  ],
                  isRecallable: true,
                },
              ],
            },
          ],
        },
      },
    })
  },
  stubRecallPerson: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [],
      },
    })
  },
  stubRecallPersonWithExistingRecall: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },

        jsonBody: [
          {
            recallUuid: 'ABC',
            prisonerId: 'A0164ED',
            revocationDate: '2018-03-03T00:00:00.000Z',
            returnToCustodyDate: null,
            recallType: 'LR',
            courtCaseIds: [],
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      },
    })
  },
  stubSingleRecall: (recallUuid: string): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/recall/${recallUuid}`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },

        jsonBody: {
          recallUuid,
          prisonerId: 'A0164ED',
          revocationDate: '2018-03-03T00:00:00.000Z',
          returnToCustodyDate: null,
          recallType: 'LR',
          courtCaseIds: [],
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      },
    })
  },
  stubRecallPersonNonManual: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },

        jsonBody: [
          {
            recallUuid: 'ABC',
            prisonerId: 'A0164ED',
            revocationDate: '2018-03-03T00:00:00.000Z',
            returnToCustodyDate: null,
            recallType: {
              code: 'LR',
              description: 'Standard',
              fixedTerm: false,
            },
            courtCaseIds: [],
          },
        ],
      },
    })
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
  },
  stubSearchCourtCasesWithSingleUnknownSentence: ({
    prisonerId = 'A0164ED',
  }: { prisonerId?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          totalCases: 1,
          cases: [
            {
              courtCaseUuid: 'test-case-123',
              reference: 'CC123/2024',
              courtCode: 'ABRYCT',
              courtName: 'Aberystwyth Crown Court',
              date: '2024-01-15',
              status: 'ACTIVE',
              isSentenced: true,
              sentences: [
                {
                  sentenceUuid: 'sentence-456',
                  offenceCode: 'HA04005',
                  sentenceType: 'unknown pre-recall sentence',
                  sentenceTypeUuid: 'f9a1551e-86b1-425b-96f7-23465a0f05fc',
                  classification: 'UNKNOWN',
                  systemOfRecord: 'RAS',
                  periodLengths: [
                    {
                      years: 2,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'SENTENCE_LENGTH',
                      legacyData: null,
                      periodLengthUuid: 'period-789',
                    },
                  ],
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2024-01-15',
                    nomisOutcomeCode: null,
                    outcomeDescription: null,
                    outcomeDispositionCode: null,
                    outcomeConvictionFlag: true,
                  },
                  countNumber: null,
                  sentenceServeType: 'CONCURRENT',
                  sentenceLegacyData: {
                    sentenceCalcType: null,
                    sentenceCategory: null,
                    sentenceTypeDesc: null,
                    postedDate: '2024-01-15T10:00:00.000000',
                    active: true,
                    nomisLineReference: '1',
                  },
                  isRecallable: true,
                },
              ],
            },
          ],
        },
      },
    })
  },
  stubSearchCourtCasesWithUpdatedSentence: ({
    prisonerId = 'A0164ED',
    sentenceType = 'SDS (Standard Determinate Sentence)',
    classification = 'STANDARD',
  }: { prisonerId?: string; sentenceType?: string; classification?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          totalCases: 1,
          cases: [
            {
              courtCaseUuid: 'test-case-123',
              reference: 'CC123/2024',
              courtCode: 'ABRYCT',
              courtName: 'Aberystwyth Crown Court',
              date: '2024-01-15',
              status: 'ACTIVE',
              isSentenced: true,
              sentences: [
                {
                  sentenceUuid: 'sentence-456',
                  offenceCode: 'HA04005',
                  sentenceType,
                  classification,
                  systemOfRecord: 'RAS',
                  periodLengths: [
                    {
                      years: 2,
                      months: null,
                      weeks: null,
                      days: null,
                      periodOrder: 'years,months,weeks,days',
                      periodLengthType: 'SENTENCE_LENGTH',
                      legacyData: null,
                      periodLengthUuid: 'period-789',
                    },
                  ],
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2024-01-15',
                    nomisOutcomeCode: null,
                    outcomeDescription: null,
                    outcomeDispositionCode: null,
                    outcomeConvictionFlag: true,
                  },
                  countNumber: null,
                  sentenceServeType: 'CONCURRENT',
                  sentenceLegacyData: {
                    sentenceCalcType: null,
                    sentenceCategory: null,
                    sentenceTypeDesc: null,
                    postedDate: '2024-01-15T10:00:00.000000',
                    active: true,
                    nomisLineReference: '1',
                  },
                  isRecallable: true,
                },
              ],
            },
          ],
        },
      },
    })
  },
  stubUpdateSentenceTypes: ({
    courtCaseUuid = 'test-case-123',
    updates = [{ sentenceUuid: 'sentence-456', sentenceType: 'sds-uuid' }],
  }: {
    courtCaseUuid?: string
    updates?: Array<{ sentenceUuid: string; sentenceType: string }>
  } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: `/remand-and-sentencing-api/court-case/${courtCaseUuid}/sentences/update-types`,
        bodyPatterns: [
          {
            equalToJson: JSON.stringify({ updates }),
          },
        ],
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          updatedSentenceUuids: updates.map(u => u.sentenceUuid),
        },
      },
    })
  },
  stubUpdateSentenceTypesError: ({
    courtCaseUuid = 'test-case-123',
    status = 422,
    errorMessage = 'Validation failed',
  }: { courtCaseUuid?: string; status?: number; errorMessage?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: `/remand-and-sentencing-api/court-case/${courtCaseUuid}/sentences/update-types`,
      },
      response: {
        status,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          status,
          userMessage: errorMessage,
          developerMessage: errorMessage,
        },
      },
    })
  },
  stubSearchSentenceTypes: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: '/remand-and-sentencing-api/sentence-type/search',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            sentenceTypeUuid: 'sds-uuid',
            description: 'SDS (Standard Determinate Sentence)',
            classification: 'STANDARD',
            displayOrder: 1,
          },
          {
            sentenceTypeUuid: 'eds-uuid',
            description: 'EDS (Extended Determinate Sentence)',
            classification: 'EXTENDED',
            displayOrder: 2,
          },
          {
            sentenceTypeUuid: 'sopc-uuid',
            description: 'SOPC (Sentence of a particular concern)',
            classification: 'INDETERMINATE',
            displayOrder: 3,
          },
          {
            sentenceTypeUuid: 'dto-uuid',
            description: 'DTO (Detention and Training Order)',
            classification: 'STANDARD',
            displayOrder: 4,
          },
        ],
      },
    })
  },
  stubIsRecallPossible: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPath: '/remand-and-sentencing-api/recall/is-possible',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          isRecallPossible: 'YES',
        },
      },
    })
  },

  stubTest: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A0164ED',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            recallUuid: 'ab8bf994-4329-4de1-9187-3bb5254325d0',
            prisonerId: 'A6684EC',
            revocationDate: '2025-10-20',
            returnToCustodyDate: '2025-10-25',
            inPrisonOnRevocationDate: false,
            recallType: 'LR',
            createdAt: '2026-02-02T10:28:17Z',
            createdByUsername: 'RECORD_A_RECALL_USER',
            createdByPrison: 'KMI',
            source: 'DPS',
            courtCases: [
              {
                courtCaseReference: null,
                courtCaseUuid: '77cd2265-7903-406b-bbad-8268696779ee',
                courtCode: 'PENRCT',
                sentencingAppearanceDate: '2023-08-14',
                sentences: [
                  {
                    sentenceUuid: '579e2584-18a6-43b1-97f7-36156d1b8bd9',
                    offenceCode: 'WA11001',
                    offenceStartDate: '2023-02-02',
                    offenceEndDate: null,
                    sentenceDate: '2023-08-14',
                    lineNumber: '1',
                    countNumber: null,
                    periodLengths: [
                      {
                        years: 1,
                        months: null,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'SENTENCE_LENGTH',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'IMP',
                          sentenceTermDescription: 'Imprisonment',
                        },
                        periodLengthUuid: '57f57e29-88aa-41b6-9605-9d7876c24b72',
                      },
                      {
                        years: 2,
                        months: null,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'LICENCE_PERIOD',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'LIC',
                          sentenceTermDescription: 'Licence',
                        },
                        periodLengthUuid: '5a7cabbc-b000-449e-8e03-b17a05f77838',
                      },
                    ],
                    sentenceServeType: 'CONCURRENT',
                    sentenceTypeDescription: 'Unknown pre-recall sentence',
                  },
                ],
              },
              {
                courtCaseReference: null,
                courtCaseUuid: 'dd1f6eff-8922-48ac-858a-fe2609ec96d1',
                courtCode: 'PENRCT',
                sentencingAppearanceDate: '2025-03-03',
                sentences: [
                  {
                    sentenceUuid: 'aa64f43f-8d81-460a-830d-5305f9153a2a',
                    offenceCode: 'TP47017',
                    offenceStartDate: '2025-02-02',
                    offenceEndDate: null,
                    sentenceDate: '2025-03-03',
                    lineNumber: '2',
                    countNumber: null,
                    periodLengths: [
                      {
                        years: null,
                        months: 10,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'SENTENCE_LENGTH',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'IMP',
                          sentenceTermDescription: 'Imprisonment',
                        },
                        periodLengthUuid: '79e8ddea-7694-4572-b8fd-e78f725e2e73',
                      },
                    ],
                    sentenceServeType: 'CONCURRENT',
                    sentenceTypeDescription: 'Unknown pre-recall sentence',
                  },
                ],
              },
            ],
            ual: {
              id: '155ec2e2-2622-4c4d-b5a7-076f2e581d59',
              days: 4,
            },
            calculationRequestId: null,
            isManual: true,
          },
          {
            recallUuid: 'e62d4060-272b-4aa1-bf1a-def285b8edf4',
            prisonerId: 'A6684EC',
            revocationDate: null,
            returnToCustodyDate: null,
            inPrisonOnRevocationDate: null,
            recallType: 'LR',
            createdAt: '2026-01-30T16:28:18Z',
            createdByUsername: 'hmpps-prisoner-from-nomis-migration-court-sentencing-2',
            createdByPrison: null,
            source: 'NOMIS',
            courtCases: [
              {
                courtCaseReference: '12345',
                courtCaseUuid: '90606348-64c2-4b77-92f9-d1659cfc830a',
                courtCode: 'PENRCT',
                sentencingAppearanceDate: '2024-04-04',
                sentences: [
                  {
                    sentenceUuid: '27802785-d787-4b58-8c18-4ca9b84e7438',
                    offenceCode: 'AN16074',
                    offenceStartDate: '2023-03-03',
                    offenceEndDate: null,
                    sentenceDate: '2024-04-04',
                    lineNumber: '3',
                    countNumber: null,
                    periodLengths: [
                      {
                        years: 2,
                        months: null,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'SENTENCE_LENGTH',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'IMP',
                          sentenceTermDescription: 'Imprisonment',
                        },
                        periodLengthUuid: '8fd4bad4-563a-47e7-ba77-23003f93c6e4',
                      },
                    ],
                    sentenceServeType: 'CONCURRENT',
                    sentenceTypeDescription: 'Unknown pre-recall sentence',
                  },
                ],
              },
            ],
            ual: null,
            calculationRequestId: null,
            isManual: true,
          },
          {
            recallUuid: '599dd7cc-9180-4007-9f74-aae898570ca2',
            prisonerId: 'A6684EC',
            revocationDate: null,
            returnToCustodyDate: null,
            inPrisonOnRevocationDate: null,
            recallType: 'LR',
            createdAt: '2026-01-30T16:28:18Z',
            createdByUsername: 'hmpps-prisoner-from-nomis-migration-court-sentencing-2',
            createdByPrison: null,
            source: 'NOMIS',
            courtCases: [
              {
                courtCaseReference: null,
                courtCaseUuid: 'dd1f6eff-8922-48ac-858a-fe2609ec96d1',
                courtCode: 'PENRCT',
                sentencingAppearanceDate: '2025-03-03',
                sentences: [
                  {
                    sentenceUuid: 'aa64f43f-8d81-460a-830d-5305f9153a2a',
                    offenceCode: 'TP47017',
                    offenceStartDate: '2025-02-02',
                    offenceEndDate: null,
                    sentenceDate: '2025-03-03',
                    lineNumber: '2',
                    countNumber: null,
                    periodLengths: [
                      {
                        years: null,
                        months: 10,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'SENTENCE_LENGTH',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'IMP',
                          sentenceTermDescription: 'Imprisonment',
                        },
                        periodLengthUuid: '79e8ddea-7694-4572-b8fd-e78f725e2e73',
                      },
                    ],
                    sentenceServeType: 'CONCURRENT',
                    sentenceTypeDescription: 'Unknown pre-recall sentence',
                  },
                ],
              },
            ],
            ual: null,
            calculationRequestId: null,
            isManual: true,
          },
          {
            recallUuid: '9dad0869-567d-4565-9828-ceb0a2d1d241',
            prisonerId: 'A6684EC',
            revocationDate: null,
            returnToCustodyDate: null,
            inPrisonOnRevocationDate: null,
            recallType: 'LR',
            createdAt: '2026-01-30T16:28:19Z',
            createdByUsername: 'hmpps-prisoner-from-nomis-migration-court-sentencing-2',
            createdByPrison: null,
            source: 'NOMIS',
            courtCases: [
              {
                courtCaseReference: null,
                courtCaseUuid: '77cd2265-7903-406b-bbad-8268696779ee',
                courtCode: 'PENRCT',
                sentencingAppearanceDate: '2023-08-14',
                sentences: [
                  {
                    sentenceUuid: '579e2584-18a6-43b1-97f7-36156d1b8bd9',
                    offenceCode: 'WA11001',
                    offenceStartDate: '2023-02-02',
                    offenceEndDate: null,
                    sentenceDate: '2023-08-14',
                    lineNumber: '1',
                    countNumber: null,
                    periodLengths: [
                      {
                        years: 1,
                        months: null,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'SENTENCE_LENGTH',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'IMP',
                          sentenceTermDescription: 'Imprisonment',
                        },
                        periodLengthUuid: '57f57e29-88aa-41b6-9605-9d7876c24b72',
                      },
                      {
                        years: 2,
                        months: null,
                        weeks: null,
                        days: null,
                        periodOrder: 'years,months,weeks,days',
                        periodLengthType: 'LICENCE_PERIOD',
                        legacyData: {
                          lifeSentence: false,
                          sentenceTermCode: 'LIC',
                          sentenceTermDescription: 'Licence',
                        },
                        periodLengthUuid: '5a7cabbc-b000-449e-8e03-b17a05f77838',
                      },
                    ],
                    sentenceServeType: 'CONCURRENT',
                    sentenceTypeDescription: 'Unknown pre-recall sentence',
                  },
                ],
              },
            ],
            ual: null,
            calculationRequestId: null,
            isManual: true,
          },
        ],
      },
    })
  },
}
