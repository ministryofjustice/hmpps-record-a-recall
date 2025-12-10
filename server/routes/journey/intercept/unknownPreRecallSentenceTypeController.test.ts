/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import TestData from '../../../testutils/testData'
import config from '../../../config'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>
jest.mock('../../../services/recallService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>

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
    services: { auditService, recallService },
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
  it('should populate unknown-pre-recall-type page with correct details', async () => {
    // Given
    recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])
    recallService.isRecallPossible.mockResolvedValue({
      isRecallPossible: 'UNKNOWN_PRE_RECALL_MAPPING',
      sentenceIds: ['72f79e94-b932-4e0f-9c93-3964047c76f0', '0ef67702-99cd-4821-9235-46ce42c9f39e'],
    })
    // When
    const response = await request(app).get(
      `/person/${nomsId}/recall/create/${journeyId}/unknown-pre-recall-sentence-type`,
    )

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const text = $('#main-content').text()
    expect(text).toContain('Some sentence types need updating')
    expect(text).toContain('Count 1 of court case REF-1')
    expect(text).toContain('Count 2 of court case REF-1')
    expect(text).toContain('Continue')

    const href = $('[data-qa="continue-unknown-pre-recall"]').attr('href')

    expect(href).toBe(
      `${config.urls.remandAndSentencing}/person/${nomsId}/unknown-recall-sentence?sentenceUuids=72f79e94-b932-4e0f-9c93-3964047c76f0&sentenceUuids=0ef67702-99cd-4821-9235-46ce42c9f39e`,
    )
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/unknown-pre-recall-sentence-type`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })

  it('should set the RAS URL correctly - limit to only where recall is possible', async () => {
    recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])
    recallService.isRecallPossible.mockResolvedValue({
      isRecallPossible: 'UNKNOWN_PRE_RECALL_MAPPING',
      sentenceIds: ['72f79e94-b932-4e0f-9c93-3964047c76f0'],
    })

    const res = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/unknown-pre-recall-sentence-type`)

    const $ = cheerio.load(res.text)

    const href = $('[data-qa="continue-unknown-pre-recall"]').attr('href')
    expect(href).toBe(
      `${config.urls.remandAndSentencing}/person/${nomsId}/unknown-recall-sentence?sentenceUuids=72f79e94-b932-4e0f-9c93-3964047c76f0`,
    )
  })
})
