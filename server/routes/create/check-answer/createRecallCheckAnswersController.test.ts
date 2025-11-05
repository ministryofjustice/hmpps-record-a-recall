/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import RecallService from '../../../services/recallService'
import { CreateRecall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import AuditService from '../../../services/auditService'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()
const recallToBeCreated = {
  createdByPrison: 'KMI',
  createdByUsername: 'user',
  prisonerId: nomsId,
  recallTypeCode: 'LR',
  inPrisonOnRevocationDate: false,
  revocationDate: '2025-10-01',
  returnToCustodyDate: '2025-10-05',
  sentenceIds: ['72f79e94-b932-4e0f-9c93-3964047c76f0'],
} as CreateRecall

jest.mock('../../../services/recallService')
jest.mock('../../../services/auditService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

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
    returnToCustodyDate: {
      day: 5,
      month: 10,
      year: 2025,
    },
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
    recallType: 'LR',
    sentenceIds: ['72f79e94-b932-4e0f-9c93-3964047c76f0'],
  }
  app = appWithAllRoutes({
    services: { recallService, auditService },
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
  it('should render check your answers page out of custody at recall', async () => {
    // Given
    recallService.getApiRecallFromJourney.mockReturnValue(recallToBeCreated)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/check-answers`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/recall-type`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`,
    )

    const checkAnswerRows = $('#check-answers').children()
    const revocationRow = checkAnswerRows.eq(0)
    expect(revocationRow.text()).toContain('Date of revocation')
    expect(revocationRow.text()).toContain('01 Oct 2025')
    expect(revocationRow.find('a').attr('href')).toContain(
      `/person/${nomsId}/recall/create/${journeyId}/revocation-date`,
    )

    const arrestDateRow = checkAnswerRows.eq(1)
    expect(arrestDateRow.text()).toContain('Arrest date')
    expect(arrestDateRow.text()).toContain('05 Oct 2025')
    expect(arrestDateRow.find('a').attr('href')).toContain(
      `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`,
    )

    const sentencesRow = checkAnswerRows.eq(2)
    expect(sentencesRow.text()).toContain('Sentences')
    expect(sentencesRow.text()).toContain('1 sentence')
    expect(sentencesRow.find('a').attr('href')).toContain(
      `/person/${nomsId}/recall/create/${journeyId}/review-sentences`,
    )

    const recallTypeRow = checkAnswerRows.eq(3)
    expect(recallTypeRow.text()).toContain('Recall type')
    expect(recallTypeRow.text()).toContain('Standard')
    expect(recallTypeRow.find('a').attr('href')).toContain(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    const ualText = $('#ual-text')
    expect(ualText.text()).toContain('3 days of UAL')
  })

  it('should render check your answers page in custody at recall', async () => {
    // Given
    recallService.getApiRecallFromJourney.mockReturnValue({
      ...recallToBeCreated,
      inPrisonOnRevocationDate: true,
      returnToCustodyDate: null,
    })

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/check-answers`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const checkAnswerRows = $('#check-answers').children()
    const arrestDateRow = checkAnswerRows.eq(1)
    expect(arrestDateRow.text()).toContain('Arrest date')
    expect(arrestDateRow.text()).toContain('In custody at revocation')
    expect(arrestDateRow.find('a').attr('href')).toContain(
      `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`,
    )

    const ualText = $('#ual-text')
    expect(ualText.length).toBe(0)
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/check-answers`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it('should redirect to confirm page and create recall', async () => {
    // Given
    const createdRecallId: string = uuidv4()
    recallService.createRecall.mockResolvedValue({
      recallUuid: createdRecallId,
    })

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/check-answers`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${createdRecallId}/confirmed`)

    // Then
    expect(recallService.createRecall.mock.calls.length).toBe(1)
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/check-answers`)
      .type('form')
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
