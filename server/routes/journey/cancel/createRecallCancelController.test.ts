/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import RecallJourneyUrls from '../recallJourneyUrls'
import GlobalRecallUrls from '../../globalRecallUrls'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()
let sessionRef: Partial<SessionData>

jest.mock('../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
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
    services: { auditService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      sessionRef = receivedSession
      receivedSession.recallJourneys = {}
      receivedSession.recallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

const baseUrl = `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel?returnKey=revocationDate`

describe('GET', () => {
  it('should render return recall type page with correct navigation', async () => {
    const response = await request(app).get(baseUrl)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const headingText = $('[data-qa="main-heading"]').text().trim()
    expect(headingText).toContain('Are you sure you want to cancel')

    const backLink = $('[data-qa="back-link"]')
    expect(backLink.attr('href')).toBe(RecallJourneyUrls.revocationDate(nomsId, journeyId, 'create', null))
  })
})

describe('POST', () => {
  it('should redirect back to the correct page when confirmCancel = NO', async () => {
    const response = await request(app).post(baseUrl).type('form').send({ confirmCancel: 'NO' })

    expect(response.status).toBe(302)
    expect(response.header.location).toBe(RecallJourneyUrls.revocationDate(nomsId, journeyId, 'create', null))
    expect(sessionRef.recallJourneys?.[journeyId]).toBeDefined()
  })

  it('should clear the journey and redirect home when confirmCancel = YES', async () => {
    const response = await request(app).post(baseUrl).type('form').send({ confirmCancel: 'YES' })

    expect(response.status).toBe(302)
    expect(response.header.location).toBe(GlobalRecallUrls.home(nomsId))
    expect(sessionRef.recallJourneys?.[journeyId]).toBeUndefined()
  })
})
