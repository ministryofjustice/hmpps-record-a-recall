/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { RecordARecallDecisionResult } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/calculateReleaseDatesService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>

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
    services: { calculateReleaseDatesService },
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
    ['CRITICAL_ERRORS', `/person/${nomsId}/recall/create/${journeyId}/validation-intercept`],
    ['AUTOMATED', `/person/${nomsId}/recall/create/${journeyId}/review-sentences`],
    ['NO_RECALLABLE_SENTENCES_FOUND', `/person/${nomsId}/recall/create/${journeyId}/no-recallable-sentences-found`],
    ['VALIDATION', `/person/${nomsId}/recall/create/${journeyId}/manual/start`],
    ['CONFLICTING_ADJUSTMENTS', `/person/${nomsId}/recall/create/${journeyId}/conflicting-adjustments`],
  ])(
    'Should redirect to the correct page for each decision type',
    async (decision: RecordARecallDecisionResult['decision'], expectedRedirect: string) => {
      // Given
      calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue({
        decision,
        eligibleRecallTypes: [],
        recallableSentences: [],
        validationMessages: [],
      })

      await request(app)
        .get(`/person/${nomsId}/recall/create/${journeyId}/recall-decision`)
        .expect(302)
        .expect('Location', expectedRedirect)

      expect(calculateReleaseDatesService.makeDecisionForRecordARecall.mock.calls.length).toEqual(1)
      expect(calculateReleaseDatesService.makeDecisionForRecordARecall.mock.calls[0][1]).toEqual({
        revocationDate: '2025-10-01',
      })
    },
  )

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/recall-decision`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
