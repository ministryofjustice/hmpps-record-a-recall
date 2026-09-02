import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import RecallJourneyUrls from '../../recallJourneyUrls'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  // Given
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: true,
    calculationRequestId: 991,
    sentenceIds: ['sentence-1'],
    automatedCalculationData: { recallableSentences: [] } as never,
    crdsValidationResult: {
      latestCriticalMessages: [],
      latestOtherMessages: [],
      penultimateCriticalMessages: [],
      penultimateOtherMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }

  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
    sessionReceiver: (session: Partial<SessionData>) => {
      // eslint-disable-next-line no-param-reassign
      session.recallJourneys = { [journeyId]: existingJourney }
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /manual/skip-intercept', () => {
  const baseUrl = `/person/${nomsId}/recall/create/${journeyId}/manual/skip-intercept`

  it('sets switchedFromAutomatedJourney to true, clears automated calculation data, resets isCheckingAnswers, and redirects to manualSelectCases', async () => {
    const res = await request(app).get(baseUrl).expect(302)

    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases`)
    expect(existingJourney.switchedFromAutomatedJourney).toBe(true)
    expect(existingJourney.calculationRequestId).toBeUndefined()
    expect(existingJourney.automatedCalculationData).toBeUndefined()
    expect(existingJourney.sentenceIds).toBeUndefined()
    expect(existingJourney.isCheckingAnswers).toBe(false)
  })

  it('redirects to start if journey not found in session', async () => {
    const missingJourneyId = uuidv4()

    const res = await request(app)
      .get(`/person/${nomsId}/recall/create/${missingJourneyId}/manual/skip-intercept`)
      .expect(302)

    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/start`)
  })

  it('builds the same URL as RecallJourneyUrls.manualJourneySkipIntercept', () => {
    expect(baseUrl).toBe(RecallJourneyUrls.manualJourneySkipIntercept(nomsId, journeyId, 'create', null))
  })
})
