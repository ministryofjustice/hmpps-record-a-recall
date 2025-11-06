/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { RecordARecallDecisionResult } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import AuditService from '../../../services/auditService'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/auditService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
    isManual: false,
    revocationDate: {
      day: 1,
      month: 10,
      year: 2025,
    },
    inCustodyAtRecall: true,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }
  app = appWithAllRoutes({
    services: { calculateReleaseDatesService, auditService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.createRecallJourneys = {}
      receivedSession.createRecallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it.each([
    ['CRITICAL_ERRORS', undefined, `/person/${nomsId}/recall/create/${journeyId}/validation-intercept`],
    ['AUTOMATED', 991, `/person/${nomsId}/recall/create/${journeyId}/review-sentences`],
    [
      'NO_RECALLABLE_SENTENCES_FOUND',
      undefined,
      `/person/${nomsId}/recall/create/${journeyId}/no-recallable-sentences-found`,
    ],
    ['VALIDATION', undefined, `/person/${nomsId}/recall/create/${journeyId}/manual/start`],
    ['CONFLICTING_ADJUSTMENTS', undefined, `/person/${nomsId}/recall/create/${journeyId}/conflicting-adjustments`],
  ])(
    `Should redirect to the correct page for decision %s`,
    async (
      decision: RecordARecallDecisionResult['decision'],
      calculationRequestId: number,
      expectedRedirect: string,
    ) => {
      // Given
      calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue({
        decision,
        eligibleRecallTypes: [],
        recallableSentences: [],
        validationMessages: [],
        calculationRequestId,
      })

      await request(app)
        .get(`/person/${nomsId}/recall/create/${journeyId}/recall-decision`)
        .expect(302)
        .expect('Location', expectedRedirect)

      expect(calculateReleaseDatesService.makeDecisionForRecordARecall.mock.calls.length).toEqual(1)
      expect(calculateReleaseDatesService.makeDecisionForRecordARecall.mock.calls[0][1]).toEqual({
        revocationDate: '2025-10-01',
      })
      expect(existingJourney.calculationRequestId).toEqual(calculationRequestId)
    },
  )

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/recall-decision`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
