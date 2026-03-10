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
    inCustodyAtRecall: true,
    crdsValidationResult: {
      latestCriticalMessages: [
        {
          code: 'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR',
          message: 'Court case 1 NOMIS line reference 1 must have a licence term of at least one year.',
          arguments: [],
          type: 'VALIDATION',
          calculationUnsupported: true,
        },
      ],
      latestOtherMessages: [],
      penultimateCriticalMessages: [],
      penultimateOtherMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
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

  it('should return to start of journey if there are no latest or penultimate critical messages', async () => {
    existingJourney.crdsValidationResult.latestCriticalMessages = []
    existingJourney.crdsValidationResult.penultimateCriticalMessages = []

    await request(app)
      .get(`/person/${nomsId}/recall/create/${journeyId}/validation-intercept`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })

  it('should render penultimate critical errors page when only penultimateCriticalMessages exist', async () => {
    // Given
    existingJourney.crdsValidationResult.latestCriticalMessages = []
    existingJourney.crdsValidationResult.penultimateCriticalMessages = [
      {
        code: 'EDS_LICENCE_TERM_MORE_THAN_EIGHT_YEARS',
        message: 'Penultimate critical error message.',
        arguments: [],
        type: 'VALIDATION',
        calculationUnsupported: true,
      },
    ]

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/validation-intercept`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('h1').text()).toContain('You can record a recall, but some of the information might be wrong')
    expect($('[data-qa=validation-message]').text()).toContain('penultimate critical error message')
    expect($('[data-qa=continue-btn]').attr('href')).toContain('/revocation-date')
  })

  it('should render multiple penultimate critical messages as a bullet list', async () => {
    // Given
    existingJourney.crdsValidationResult.latestCriticalMessages = []
    existingJourney.crdsValidationResult.penultimateCriticalMessages = [
      {
        code: 'EDS_LICENCE_TERM_MORE_THAN_EIGHT_YEARS',
        message: 'First penultimate error.',
        arguments: [],
        type: 'VALIDATION',
        calculationUnsupported: true,
      },
      {
        code: 'EDS_LICENCE_TERM_MORE_THAN_EIGHT_YEARS',
        message: 'Second penultimate error.',
        arguments: [],
        type: 'VALIDATION',
        calculationUnsupported: true,
      },
    ]

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/validation-intercept`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const listItems = $('.govuk-list--bullet li')
    expect(listItems.length).toBe(2)
    expect(listItems.eq(0).text()).toContain('First penultimate error')
    expect(listItems.eq(1).text()).toContain('Second penultimate error')
  })
})
