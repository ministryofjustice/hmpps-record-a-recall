/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, flashProvider, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import RecallService from '../../../services/recallService'

let app: Express
let existingJourney: CreateRecallJourney
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
    isManual: false,
    isCheckingAnswers: false,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }
  app = appWithAllRoutes({
    services: { auditService, recallService },
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
  it('should render revocation date page with correct navigation', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/revocation-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(`/person/${nomsId}`)
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`,
    )

    expect($('#day').val()).toBeUndefined()
    expect($('#month').val()).toBeUndefined()
    expect($('#year').val()).toBeUndefined()
  })

  it('should populate the form with session values if there are no form values', async () => {
    // Given
    existingJourney.revocationDate = { day: 1, month: 2, year: 2012 }

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/revocation-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#day').val()).toStrictEqual('1')
    expect($('#month').val()).toStrictEqual('2')
    expect($('#year').val()).toStrictEqual('2012')
  })

  it('should populate the form with previous form values even if there are session values', async () => {
    // Given
    existingJourney.revocationDate = { day: 1, month: 2, year: 2012 }
    const form = { day: '15', month: '06', year: '1982' }
    flashProvider.mockImplementation(key => (key === 'formResponses' ? [JSON.stringify(form)] : []))

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/revocation-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#day').val()).toStrictEqual('15')
    expect($('#month').val()).toStrictEqual('06')
    expect($('#year').val()).toStrictEqual('1982')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/revocation-date`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it.each([
    [false, `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`],
    [true, `/person/${nomsId}/recall/create/${journeyId}/check-answers`],
  ])(
    'should set the revocation date on the session and pass to return to custody if valid and pass to next page (%s, %s)',
    async (isCheckingAnswers: boolean, expectedNextUrl: string) => {
      // Given
      recallService.getLatestRevocationDate.mockResolvedValue(new Date('2024-01-01'))
      existingJourney.isCheckingAnswers = isCheckingAnswers

      // When
      await request(app)
        .post(`/person/${nomsId}/recall/create/${journeyId}/revocation-date`)
        .type('form')
        .send({ day: '1', month: '2', year: '2025' })
        .expect(302)
        .expect('Location', expectedNextUrl)

      // Then
      expect(existingJourney.revocationDate).toStrictEqual({
        day: 1,
        month: 2,
        year: 2025,
      })
    },
  )

  it('should return to the input page if there are validation errors', async () => {
    // Given
    recallService.getLatestRevocationDate.mockResolvedValue(new Date('2024-01-01'))
    delete existingJourney.revocationDate

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/revocation-date`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/revocation-date#`)

    // Then
    expect(existingJourney.revocationDate).toBeUndefined()
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/revocation-date`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
