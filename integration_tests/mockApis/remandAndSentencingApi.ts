import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubSearchCourtCases: ({ prisonerId = 'A1234AB' }: { prisonerId?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases`,
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
              date: '2017-06-12',
              status: 'ACTIVE',
              isSentenced: true,
              sentences: [
                {
                  sentenceUuid: 'a669b3a0-1ddc-4f4d-80b8-468b4ea529f8',
                  offenceCode: 'HA04005',
                  sentenceType: 'EDS (Extended Determinate Sentence)',
                  classification: 'EXTENDED',
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
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2025-06-12',
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
                    postedDate: '2025-06-12T10:59:45.378275',
                    active: true,
                    nomisLineReference: '2',
                  },
                  isRecallable: true,
                },
              ],
            },
            {
              courtCaseUuid: '4eb87827-f43e-48bf-80df-86c7205b581c',
              reference: '',
              courtCode: 'ABDRCT',
              date: '2017-02-12',
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
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2025-06-12',
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
                    postedDate: '2025-06-12T10:56:09.045967',
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
  stubSearchCourtCasesWithBothSDS: ({ prisonerId = 'BA1234AB' }: { prisonerId?: string } = {}): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: `/remand-and-sentencing-api/court-case/${prisonerId}/recallable-court-cases`,
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
              date: '2017-06-12',
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
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2025-06-12',
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
                    postedDate: '2025-06-12T10:59:45.378275',
                    active: true,
                    nomisLineReference: '2',
                  },
                  isRecallable: true,
                },
              ],
            },
            {
              courtCaseUuid: '4eb87827-f43e-48bf-80df-86c7205b581c',
              reference: '',
              courtCode: 'ABDRCT',
              date: '2017-02-12',
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
                  convictionDate: null,
                  chargeLegacyData: {
                    postedDate: '2025-06-12',
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
                    postedDate: '2025-06-12T10:56:09.045967',
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
  stubRecallPerson: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/remand-and-sentencing-api/recall/person/A1234AB',
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
        urlPath: '/remand-and-sentencing-api/recall/person/A1234AB',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },

        jsonBody: [
          {
            recallUuid: 'ABC',
            prisonerId: 'A1234AB',
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
          prisonerId: 'A1234AB',
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
        urlPath: '/remand-and-sentencing-api/recall/person/BA1234AB',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },

        jsonBody: [
          {
            recallUuid: 'ABC',
            prisonerId: 'BA1234AB',
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
    prisonerId = 'A1234AB',
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
    prisonerId = 'A1234AB',
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
}
