/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, flashProvider, user } from '../../testutils/appSetup'
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
    revocationDate: {
      day: 1,
      month: 10,
      year: 2025,
    },
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
      receivedSession.createRecallJourneys = {}
      receivedSession.createRecallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should render return to custody page with correct navigation', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/revocation-date`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`,
    )

    expect($('#day').val()).toBeUndefined()
    expect($('#month').val()).toBeUndefined()
    expect($('#year').val()).toBeUndefined()
    expect($('#inCustodyAtRecall-false').attr('checked')).toBeFalsy()
    expect($('#inCustodyAtRecall-true').attr('checked')).toBeFalsy()
  })

  it('should populate the form with session values if there are no form values', async () => {
    // Given
    existingJourney.returnToCustodyDate = { day: 1, month: 2, year: 2012 }
    existingJourney.inCustodyAtRecall = false

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#day').val()).toStrictEqual('1')
    expect($('#month').val()).toStrictEqual('2')
    expect($('#year').val()).toStrictEqual('2012')
    expect($('#inCustodyAtRecall-false').attr('checked')).toBeTruthy()
    expect($('#inCustodyAtRecall-true').attr('checked')).toBeFalsy()
  })

  it('should populate the form with previous form values even if there are session values', async () => {
    // Given
    existingJourney.returnToCustodyDate = { day: 1, month: 2, year: 2012 }
    existingJourney.inCustodyAtRecall = false
    const form = { day: '15', month: '06', year: '1982', inCustodyAtRecall: true }
    flashProvider.mockImplementation(key => (key === 'formResponses' ? [JSON.stringify(form)] : []))

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#day').val()).toStrictEqual('15')
    expect($('#month').val()).toStrictEqual('06')
    expect($('#year').val()).toStrictEqual('1982')
    expect($('#inCustodyAtRecall-false').attr('checked')).toBeFalsy()
    expect($('#inCustodyAtRecall-true').attr('checked')).toBeTruthy()
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/return-to-custody-date`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it.each([
    [false, `/person/${nomsId}/recall/create/${journeyId}/recall-decision`],
    [true, `/person/${nomsId}/recall/create/${journeyId}/recall-decision`],
  ])(
    'should set the return to custody date on the session and pass to return to custody if valid and pass to next page (%s, %s)',
    async (isCheckingAnswers: boolean, expectedNextUrl: string) => {
      // Given
      existingJourney.isCheckingAnswers = isCheckingAnswers

      // When
      await request(app)
        .post(`/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`)
        .type('form')
        .send({ day: '10', month: '10', year: '2025', inCustodyAtRecall: false })
        .expect(302)
        .expect('Location', expectedNextUrl)

      // Then
      expect(existingJourney.returnToCustodyDate).toStrictEqual({
        day: 10,
        month: 10,
        year: 2025,
      })
    },
  )

  it('should return to the input page if there are validation errors', async () => {
    // Given
    delete existingJourney.returnToCustodyDate

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date#`)

    // Then
    expect(existingJourney.returnToCustodyDate).toBeUndefined()
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/return-to-custody-date`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
