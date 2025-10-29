import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

beforeEach(() => {
  // Given
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isManual: false,
    isCheckingAnswers: false,
    isManual: true,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }

  app = appWithAllRoutes({
    services: {},
    userSupplier: () => user,
    sessionReceiver: (session: Partial<SessionData>) => {
      // eslint-disable-next-line no-param-reassign
      session.createRecallJourneys = { [journeyId]: existingJourney }
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /manual/start', () => {
  it('renders the manual intercept screen with correct heading and buttons', async () => {
    // When
    const res = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/manual/start`).expect(200)

    const $ = cheerio.load(res.text)

    // Then
    expect($('h1').text().trim()).toBe('Select all the cases that are relevant to this recall')

    const continueButton = $('[data-qa=continue-manual-action]')
    expect(continueButton.text().trim()).toBe('Continue')
    expect(continueButton.attr('type')).toBe('submit')
    expect(continueButton.attr('id')).toBe('continue-manual')

    const cancelLink = $('.moj-interruption-card__actions a[href]')
    expect(cancelLink.attr('href')).toBe(`/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`)
    expect(cancelLink.text().trim()).toBe('Cancel recall')
  })
})

describe('POST /manual/start', () => {
  const url = `/person/${nomsId}/recall/create/${journeyId}/manual/start`

  it('sets isManual=true and redirects to manualSelectCases when not checking answers', async () => {
    // Given
    existingJourney.isCheckingAnswers = false

    // When
    const res = await request(app).post(url).type('form').send({ _csrf: 'token' }).expect(302)

    // Then
    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/select-cases`)
    expect(existingJourney.isManual).toBe(true)
    expect(new Date(existingJourney.lastTouched).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('sets isManual=true and redirects to checkAnswers when isCheckingAnswers=true', async () => {
    // Given
    existingJourney.isCheckingAnswers = true

    // When
    const res = await request(app).post(url).type('form').send({ _csrf: 'token' }).expect(302)

    // Then
    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/check-answers`)
    expect(existingJourney.isManual).toBe(true)
  })

  it('redirects to start if journey not found in session', async () => {
    // Given
    const missingJourneyId = uuidv4()

    // when
    const res = await request(app)
      .post(`/person/${nomsId}/recall/create/${missingJourneyId}/manual/start`)
      .type('form')
      .send({ _csrf: 'token' })
      .expect(302)

    // then
    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/start`)
  })
})
