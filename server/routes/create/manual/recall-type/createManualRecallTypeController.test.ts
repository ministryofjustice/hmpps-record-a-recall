/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, flashProvider, user } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import CreateRecallUrls from '../../createRecallUrls'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/auditService')
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
      receivedSession.createRecallJourneys = {}
      receivedSession.createRecallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  const baseUrl = `/person/${nomsId}/recall/create/${journeyId}/manual/select-recall-type`
  it('should render return recall type page with correct navigation', async () => {
    const response = await request(app).get(baseUrl)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`,
    )

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })

  it('should populate the form with session values if there are no form values', async () => {
    // Given
    existingJourney.recallType = 'LR'

    // When
    const response = await request(app).get(baseUrl)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#recallType-LR').attr('checked')).toBeTruthy()
    expect($('#recallType-FTR_14').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })

  it('should populate the form with previous form values even if there are session values', async () => {
    // Given
    existingJourney.recallType = 'LR'
    const form = { recallType: 'FTR_14' }
    flashProvider.mockImplementation((key: string) => (key === 'formResponses' ? [JSON.stringify(form)] : []))

    // When
    const response = await request(app).get(baseUrl)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').attr('checked')).toBeTruthy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/manual/select-recall-type`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })

  describe('backlink tests', () => {
    it.each([
      [false, CreateRecallUrls.manualCheckSentences(nomsId, journeyId)],
      [true, CreateRecallUrls.manualCheckAnswers(nomsId, journeyId)],
    ])(
      'shows correct back link when check-your-answers is %s',
      async (isCheckingAnswers: boolean, expectedNextUrl: string) => {
        existingJourney.isCheckingAnswers = isCheckingAnswers

        const res = await request(app).get(baseUrl)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(expectedNextUrl)
      },
    )
  })
})

describe('POST', () => {
  it('should redirect to check your answers if passed validation', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/manual/select-recall-type`)
      .type('form')
      .send({ recallType: 'FTR_14' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/manual/check-answers`)

    expect(existingJourney.recallType).toStrictEqual('FTR_14')
  })

  it('should return to the input page if there are validation errors', async () => {
    existingJourney.recallType = 'LR'

    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/manual/select-recall-type`)
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/manual/select-recall-type#`)

    // Then
    expect(existingJourney.recallType).toStrictEqual('LR')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/manual/select-recall-type`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
