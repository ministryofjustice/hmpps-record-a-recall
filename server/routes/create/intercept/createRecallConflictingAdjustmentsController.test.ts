/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import AdjustmentsService from '../../../services/adjustmentsService'
import TestData from '../../../testutils/testData'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>

jest.mock('../../../services/calculateReleaseDatesService')
const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>

jest.mock('../../../services/adjustmentsService')
const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>

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
  }
  app = appWithAllRoutes({
    services: { auditService, calculateReleaseDatesService, adjustmentsService },
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
  it('should render conflicting adjustment intercept', async () => {
    // Given
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(
      TestData.conflictingAdjustmentsDecision(),
    )
    adjustmentsService.getAdjustmentById.mockResolvedValue(TestData.ualAdjustment())

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/conflicting-adjustments`)

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const text = $('#main-content').text()
    expect(text).toContain('The revocation date and arrest date overlap with existing adjustments')
    expect(text).toContain('A revocation date of 01 Oct 2025')
    expect(text).toContain('An arrest date of 05 Oct 2025')
    expect(text).toContain('Unlawfully at large')
    expect(text).toContain('(Recall)')
    expect(text).toContain('from 02 Oct 2025 to 04 Oct 2025')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/conflicting-adjustments`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
