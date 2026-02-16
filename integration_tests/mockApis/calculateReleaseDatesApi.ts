import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

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
  stubValidate: ({ prisonerId = 'A0164ED' }: { prisonerId?: string } = {}): SuperAgentRequest =>
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
  stubRecordARecallDecision: ({ prisonerId = 'A0164ED' }: { prisonerId?: string } = {}): SuperAgentRequest =>
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
            calculationRequestId: 89568,
            recallableSentences: [
              {
                sentenceSequence: 1,
                bookingId: 1233536,
                uuid: '52ba27a7-f37b-4d1f-b3d8-af9e27a4ec6a',
                sentenceCalculation: {
                  conditionalReleaseDate: '2025-08-24',
                  actualReleaseDate: '2025-08-22',
                  licenseExpiry: '2026-03-31',
                },
              },
            ],
            expiredSentences: [],
            ineligibleSentences: [],
            sentencesBeforeInitialRelease: [],
            unexpectedRecallTypes: ['FTR_14', 'FTR_56', 'FTR_HDC_14', 'FTR_HDC_28', 'CUR_HDC', 'IN_HDC'],
          },
        },
      },
    }),
}
