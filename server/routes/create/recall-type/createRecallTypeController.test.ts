/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, flashProvider, user } from '../../testutils/appSetup'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import TestData from '../../../testutils/testData'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../services/calculateReleaseDatesService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
    isManual: false,
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
    services: { calculateReleaseDatesService },
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
  it('should render return recall type page with correct navigation', async () => {
    // Given
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(TestData.automatedRecallDecision())

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/review-sentences`,
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
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(TestData.automatedRecallDecision())

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

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
    flashProvider.mockImplementation(key => (key === 'formResponses' ? [JSON.stringify(form)] : []))
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(TestData.automatedRecallDecision())

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').attr('checked')).toBeTruthy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })
  it('should not display options for ineligible recall types', async () => {
    // Given
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(
      TestData.automatedRecallDecision({
        eligibleRecallTypes: ['LR'],
      }),
    )

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').length).toBe(0)
    expect($('#recallType-FTR_28').length).toBe(0)
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/recall-type`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it('should redirect to check your answers if passed validation', async () => {
    // Given

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)
      .type('form')
      .send({ recallType: 'FTR_14' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/check-answers`)

    // Then
    expect(existingJourney.recallType).toStrictEqual('FTR_14')
  })

  it('should return to the input page if there are validation errors', async () => {
    // Given
    existingJourney.recallType = 'LR'

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/recall-type#`)

    // Then
    expect(existingJourney.recallType).toStrictEqual('LR')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/recall-type`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
