/* eslint-disable no-param-reassign */
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
    services: {},
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
  const url = `/person/${nomsId}/recall/create/${journeyId}/manual/start`

  it('renders the manual intercept screen with a 200', async () => {
    // When
    const res = await request(app).get(url).expect(200)

    // Then
    const $ = cheerio.load(res.text)
    const heading = $('h1, .govuk-heading-l').first().text().trim()

    expect(heading).toBe('Select all the cases that are relevant to this recall')
    expect($('[data-qa=continue-manual-action]').attr('href')).toBe(
      `/person/${nomsId}/recall/create/${journeyId}/manual/select-cases`,
    )

    const cancelHref = $('.moj-interruption-card__actions .govuk-link--inverse').attr('href')
    expect(cancelHref).toBe(`/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`)
  })
})

describe('POST', () => {
  const url = `/person/${nomsId}/recall/create/${journeyId}/manual/start`

  it('sets isManual=true and redirects to manualSelectCases when not checking answers', async () => {
    existingJourney.isCheckingAnswers = false

    const res = await request(app).post(url).type('form').send({ _csrf: 'token' }).expect(302)

    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/select-cases`)
    expect(existingJourney.isManual).toBe(true)
    expect(new Date(existingJourney.lastTouched).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('sets isManual=true and redirects to checkAnswers when isCheckingAnswers=true', async () => {
    existingJourney.isCheckingAnswers = true

    const res = await request(app).post(url).type('form').send({ _csrf: 'token' }).expect(302)

    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/check-answers`)
    expect(existingJourney.isManual).toBe(true)
  })

  it('redirects to start if journey not found in session', async () => {
    const res = await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/manual/start`)
      .type('form')
      .send({ _csrf: 'token' })
      .expect(302)

    expect(res.headers.location).toBe(`/person/${nomsId}/recall/create/start`)
  })
})
