/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
    inCustodyAtRecall: false,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
    revocationDate: {
      year: 2025,
      month: 10,
      day: 1,
    },
    returnToCustodyDate: {
      year: 2025,
      month: 10,
      day: 5,
    },
    recallType: 'LR',
  }
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.recallJourneys = {}
      receivedSession.recallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should unexpected recall type', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/unexpected-recall-type`)

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const text = $('#main-content').text()
    expect(text).toContain('Is this the correct recall type?')
    expect(text).toContain('The recall type currently selected is Standard')
    expect(text).toContain('Continue')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/unexpected-recall-type`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
