/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'

let app: Express
let existingJourney: CreateRecallJourney
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
    inCustodyAtRecall: true,
    crdsValidationResult: {
      criticalValidationMessages: [
        {
          code: 'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR',
          message: 'Court case 1 NOMIS line reference 1 must have a licence term of at least one year.',
          arguments: [],
          type: 'VALIDATION',
        },
      ],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }
  app = appWithAllRoutes({
    services: { auditService },
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
  it('should render validation intercept', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/validation-intercept`)

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(`/person/${nomsId}`)

    expect($('[data-qa=validation-message]').text()).toContain(
      'This is because court case 1 NOMIS line reference 1 must have a licence term of at least one year',
    )
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/validation-intercept`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
