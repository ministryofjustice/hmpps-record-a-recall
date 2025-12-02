/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, flashProvider, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import {
  ApiRecallType,
  IsRecallPossibleResponse,
} from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { AutomatedCalculationData } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import RecallService from '../../../services/recallService'

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
    calculationRequestId: 1,
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
  it('should render return recall type page with correct navigation', async () => {
    // Given
    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/review-sentences`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel?returnKey=recallType`,
    )

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })

  it('should populate the form with session values if there are no form values', async () => {
    // Given
    existingJourney.recallType = 'LR'

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

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('#recallType-LR').attr('checked')).toBeFalsy()
    expect($('#recallType-FTR_14').attr('checked')).toBeTruthy()
    expect($('#recallType-FTR_28').attr('checked')).toBeFalsy()
  })
  it('should go back to manual check sentences.', async () => {
    // Given
    existingJourney.calculationRequestId = null

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel?returnKey=recallType`,
    )
  })
  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/recall-type`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it.each([
    ['YES', [], `/person/${nomsId}/recall/create/${journeyId}/check-answers`],
    ['YES', ['FTR_28'], `/person/${nomsId}/recall/create/${journeyId}/check-answers`],
    ['YES', ['FTR_14'], `/person/${nomsId}/recall/create/${journeyId}/unexpected-recall-type`],
    ['UNKNOWN_PRE_RECALL_MAPPING', [], `/person/${nomsId}/recall/create/${journeyId}/unknown-pre-recall-sentence-type`],
    [
      'RECALL_TYPE_AND_SENTENCE_MAPPING_NOT_POSSIBLE',
      [],
      `/person/${nomsId}/recall/create/${journeyId}/unsupported-recall-type`,
    ],
  ])(
    'should redirect to correct location if recall is possible',
    async (
      isRecallPossible: IsRecallPossibleResponse['isRecallPossible'],
      unexpectedType: ApiRecallType[],
      resultUrl: string,
    ) => {
      // Given
      existingJourney.automatedCalculationData = {
        unexpectedRecallTypes: unexpectedType,
      } as unknown as AutomatedCalculationData
      recallService.isRecallPossible.mockResolvedValue({ isRecallPossible })

      // When
      await request(app)
        .post(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)
        .type('form')
        .send({ recallType: 'FTR_14' })
        .expect(302)
        .expect('Location', resultUrl)

      // Then
      expect(existingJourney.recallType).toStrictEqual('FTR_14')
    },
  )

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
