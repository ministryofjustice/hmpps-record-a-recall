import { SuperAgentRequest } from 'superagent'
import dayjs from 'dayjs'
import { stubFor } from './wiremock'
import {
  LatestCalculation,
  ValidationMessage,
} from '../../server/@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/calculate-release-dates/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubRecordARecallCRDS: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPattern: `/calculate-release-dates/record-a-recall/([A-Z0-9]*)`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          calculatedReleaseDates: {
            dates: {
              conditionalReleaseDate: '2023-12-15',
            },
            calculationRequestId: 123456789,
            bookingId: 12345678,
            prisonerId: 'A1234AB',
            calculationStatus: 'CONFIRMED',
            calculationFragments: null,
            effectiveSentenceLength: {
              years: 5,
              months: 3,
              days: 12,
              zero: false,
              negative: false,
              units: [
                {
                  durationEstimated: true,
                  duration: {
                    seconds: 158112000,
                    zero: false,
                    nano: 0,
                    negative: false,
                    positive: true,
                  },
                  timeBased: true,
                  dateBased: false,
                },
              ],
              chronology: {
                id: 'SENTENCE-1',
                calendarType: 'ISO',
                isoBased: true,
              },
            },
            calculationType: 'CALCULATED',
            approvedDates: {
              homeDetentionCurfewEligibilityDate: '2023-11-15',
              earliestReleaseDate: '2023-12-15',
            },
            calculationReference: '550e8400-e29b-41d4-a716-446655440000',
            calculationReason: null,
            otherReasonDescription: 'Good behavior adjustment',
            calculationDate: '2023-10-20',
            historicalTusedSource: 'NOMIS',
            sdsEarlyReleaseAllocatedTranche: 'TRANCHE_1',
            sdsEarlyReleaseTranche: 'TRANCHE_1',
          },
          validationMessages: [],
        },
      },
    })
  },
  stubRecordARecallCRDSNonManual: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPattern: `/calculate-release-dates/record-a-recall/([A-Z0-9]*)`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          calculatedReleaseDates: {
            dates: {
              conditionalReleaseDate: '2023-12-15',
            },
            calculationRequestId: 123456789,
            bookingId: 12345678,
            prisonerId: 'A0164ED',
            calculationStatus: 'CONFIRMED',
            calculationFragments: null,
            effectiveSentenceLength: {
              years: 5,
              months: 3,
              days: 12,
              zero: false,
              negative: false,
              units: [
                {
                  durationEstimated: true,
                  duration: {
                    seconds: 158112000,
                    zero: false,
                    nano: 0,
                    negative: false,
                    positive: true,
                  },
                  timeBased: true,
                  dateBased: false,
                },
              ],
              chronology: {
                id: 'SENTENCE-1',
                calendarType: 'ISO',
                isoBased: true,
              },
            },
            calculationType: 'CALCULATED',
            approvedDates: {
              homeDetentionCurfewEligibilityDate: '2023-11-15',
              earliestReleaseDate: '2023-12-15',
            },
            calculationReference: '550e8400-e29b-41d4-a716-446655440000',
            calculationReason: null,
            otherReasonDescription: 'Good behavior adjustment',
            calculationDate: '2023-10-20',
            historicalTusedSource: 'NOMIS',
            sdsEarlyReleaseAllocatedTranche: 'TRANCHE_1',
            sdsEarlyReleaseTranche: 'TRANCHE_1',
          },
          validationMessages: [],
        },
      },
    })
  },
  stubRecordARecallCRDSWithValidationMessages: (messages: ValidationMessage[]): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'POST',
        urlPattern: `/calculate-release-dates/record-a-recall/([A-Z0-9]*)`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          calculatedReleaseDates: null,
          validationMessages: messages,
        },
      },
    })
  },
  stubGetCalculationBreakdown: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: `/calculate-release-dates/calculation/breakdown/([0-9]*)`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          concurrentSentences: [
            {
              sentencedAt: '2020-07-17',
              sentenceLength: '12 months',
              sentenceLengthDays: 365,
              dates: {
                SLED: {
                  unadjusted: '2021-07-16',
                  adjusted: '2021-07-01',
                  daysFromSentenceStart: 365,
                  adjustedByDays: 15,
                },
                CRD: {
                  unadjusted: '2021-01-15',
                  adjusted: '2021-01-06',
                  daysFromSentenceStart: 183,
                  adjustedByDays: 9,
                },
              },
              lineSequence: 2,
              caseSequence: 2,
              externalSentenceId: {
                bookingId: 1,
                sentenceSequence: 2,
              },
              caseReference: 'ABC123',
            },
            {
              sentencedAt: '2020-12-13',
              sentenceLength: '2 months',
              sentenceLengthDays: 62,
              dates: {
                SLED: {
                  unadjusted: '2021-02-12',
                  adjusted: '2021-01-28',
                  daysFromSentenceStart: 62,
                  adjustedByDays: 15,
                },
                CRD: {
                  unadjusted: '2021-01-12',
                  adjusted: '2021-01-03',
                  daysFromSentenceStart: 31,
                  adjustedByDays: 9,
                },
              },
              lineSequence: 4,
              caseSequence: 4,
              externalSentenceId: {
                bookingId: 1,
                sentenceSequence: 4,
              },
              caseReference: 'ABC234',
            },
          ],
          consecutiveSentence: {
            sentencedAt: '2020-03-20',
            sentenceLength: '5 years 8 months',
            sentenceLengthDays: 2071,
            dates: {
              SLED: {
                unadjusted: '2018-11-20',
                adjusted: '2018-11-05',
                daysFromSentenceStart: 2071,
                adjustedByDays: 15,
              },
              CRD: {
                unadjusted: '2017-05-13',
                adjusted: '2017-05-07',
                daysFromSentenceStart: 1036,
                adjustedByDays: 6,
              },
            },
            sentenceParts: [
              {
                lineSequence: 1,
                caseSequence: 1,
                caseReference: 'ABC345',
                sentenceLength: '2 years',
                sentenceLengthDays: 730,
                consecutiveToLineSequence: null,
                consecutiveToCaseSequence: null,
                externalSentenceId: {
                  bookingId: 1,
                  sentenceSequence: 1,
                },
              },
              {
                lineSequence: 3,
                caseSequence: 3,
                caseReference: 'ABC567',
                sentenceLength: '8 months',
                sentenceLengthDays: 242,
                consecutiveToLineSequence: 1,
                consecutiveToCaseSequence: 1,
                externalSentenceId: {
                  bookingId: 1,
                  sentenceSequence: 3,
                },
              },
              {
                lineSequence: 5,
                caseSequence: 5,
                caseReference: 'ABC678',
                sentenceLength: '3 years',
                sentenceLengthDays: 1095,
                consecutiveToLineSequence: 3,
                consecutiveToCaseSequence: 3,
                externalSentenceId: {
                  bookingId: 1,
                  sentenceSequence: 5,
                },
              },
            ],
          },
          breakdownByReleaseDateType: {
            CRD: {
              rules: [],
              rulesWithExtraAdjustments: {},
              adjustedDays: -15,
              releaseDate: '2015-07-23',
              unadjustedDate: '2018-11-20',
            },
            SED: {
              rules: [],
              rulesWithExtraAdjustments: {},
              adjustedDays: -6,
              releaseDate: '2015-12-21',
              unadjustedDate: '2017-05-13',
            },
          },
          otherDates: {},
        },
      },
    })
  },
  stubSentencesAndOffences: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: `/calculate-release-dates/calculation/sentence-and-offences/([0-9]*)`,
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
            offence: { offenceEndDate: '2021-02-03', offenceCode: '123', offenceDescription: 'Doing a crime' },
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
            caseReference: 'ABC123',
            sentenceSequence: 2,
            consecutiveToSequence: 1,
            sentenceStatus: 'A',
            sentenceTypeDescription: 'SDS Standard Sentence',
            offence: { offenceEndDate: '2021-02-05', offenceDescription: 'Doing a crime' },
          },
        ],
      },
    })
  },
  stubLatestCalculation: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: `/calculate-release-dates/calculation/results/A1234AB/1234`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          dates: {
            SLED: '2018-11-05',
            CRD: '2017-05-07',
            HDCED: '2016-12-24',
          },
          calculationRequestId: 123,
        },
      },
    })
  },

  stubGetLatestCalculation: (): SuperAgentRequest => {
    const latestCalculation: LatestCalculation = {
      prisonerId: 'A1234AB',
      bookingId: 1234,
      calculationRequestId: 123,
      calculatedAt: '2024-03-05T10:30:00',
      source: 'CRDS',
      reason: 'Transfer',
      establishment: 'Kirkham (HMP)',
      calculatedByUsername: 'system',
      calculatedByDisplayName: 'System',
      dates: [
        { date: '2018-11-05', type: 'SLED', description: 'Sentence and licence expiry date', hints: [] },
        {
          date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
          type: 'CRD',
          description: 'Conditional release date',
          hints: [{ text: 'Friday, 05 May 2017 when adjusted to a working day' }],
        },
        {
          date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
          type: 'HDCED',
          description: 'Home detention curfew eligibility date',
          hints: [{ text: 'Wednesday, 28 December 2016 when adjusted to a working day' }],
        },
      ],
    }
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/calculate-release-dates/calculation/A1234AB/latest',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: latestCalculation,
      },
    })
  },
  // stubCalculateReleaseDatesValidate: ({ prisonerId = 'BA1234AB' }: { prisonerId?: string } = {}): SuperAgentRequest =>
  //   stubFor({
  //     request: {
  //       method: 'GET',
  //       urlPath: `/calculate-release-dates/record-a-recall/${prisonerId}/validate`,
  //     },
  //     response: {
  //       status: 200,
  //       headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  //       jsonBody: {
  //         criticalValidationMessages: [],
  //         otherValidationMessages: [
  //           {
  //             code: 'UNSUPPORTED_ADJUSTMENT_LAWFULLY_AT_LARGE',
  //             arguments: [],
  //             message: 'A Lawfully at large (LAL) adjustment has been recorded.',
  //             type: 'UNSUPPORTED_CALCULATION',
  //             calculationUnsupported: true,
  //           },
  //         ],
  //         earliestSentenceDate: '2023-08-14',
  //       },
  //     },
  //   }),
    stubCalculateReleaseDatesValidate: ({ prisonerId = 'A0164ED' }: { prisonerId?: string } = {}): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPath: `/calculate-release-dates/record-a-recall/${prisonerId}/validate`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          criticalValidationMessages: [],
          otherValidationMessages: [],
          earliestSentenceDate: '2025-04-01',
        },
      },
    }),
  stubRecordARecallDecision: (
  { prisonerId = 'A0164ED' }: { prisonerId?: string } = {},
): SuperAgentRequest =>
  stubFor({
    request: {
      method: 'POST',
      urlPath: `/calculate-release-dates/record-a-recall/${prisonerId}/decision`,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: {
        decision: 'AUTOMATED',
        validationMessages: [],
        conflictingAdjustments: [],
        automatedCalculationData: {
          calculationRequestId: 89503,
          recallableSentences: [
            {
              sentenceSequence: 1,
              bookingId: 1232537,
              uuid: '34f9b045-5616-49cc-9275-7b6cbaea853d',
              sentenceCalculation: {
                conditionalReleaseDate: '2024-08-30',
                actualReleaseDate: '2024-08-30',
                licenseExpiry: '2028-02-29',
              },
            },
          ],
          expiredSentences: [],
          ineligibleSentences: [],
          sentencesBeforeInitialRelease: [
            {
              sentenceSequence: 2,
              bookingId: 1232537,
              uuid: '97fd996a-3721-4f75-972b-66cdbf9ef30e',
              sentenceCalculation: {
                conditionalReleaseDate: '2026-02-27',
                actualReleaseDate: '2026-02-27',
                licenseExpiry: '2026-10-04',
              },
            },
          ],
          unexpectedRecallTypes: [
            'FTR_14',
            'FTR_56',
            'FTR_HDC_14',
            'FTR_HDC_28',
            'CUR_HDC',
            'IN_HDC',
          ],
        },
      },
    },
  }),

}
