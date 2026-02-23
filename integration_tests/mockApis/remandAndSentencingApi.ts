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

  stubAllRecallsForPrisoner: (): SuperAgentRequest => {
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
  stubCreateRecall: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'POST',
        urlPath: '/remand-and-sentencing-api/recall',
        bodyPatterns: [
          { matchesJsonPath: '$[?(@.prisonerId)]' },
          { matchesJsonPath: '$[?(@.recallTypeCode=="LR")]' },
          { matchesJsonPath: '$[?(@.revocationDate=="2026-02-01")]' },
        ],
      },
      response: {
        status: 201,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { recallUuid: 'f114f2c8-b32f-47f1-b4ab-7056e2243fdf' },
      },
    }),
  stubFixManyCharges: (prisonerId = 'A0164ED'): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'PUT',
        urlPath: `/remand-and-sentencing-api/person/${prisonerId}/fix-many-charges-to-sentence`,
      },
      response: {
        status: 204,
      },
    }),
}
