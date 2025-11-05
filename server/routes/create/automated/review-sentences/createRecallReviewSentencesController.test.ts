/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import CalculateReleaseDatesService from '../../../../services/calculateReleaseDatesService'
import TestData from '../../../../testutils/testData'
import AuditService from '../../../../services/auditService'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
jest.mock('../../../../services/auditService')
jest.mock('../../../../services/calculateReleaseDatesService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const recallService = new RecallService(null, null, null, null, null) as jest.Mocked<RecallService>
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
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }
  app = appWithAllRoutes({
    services: { calculateReleaseDatesService, recallService, auditService },
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
  it('should render check sentences page', async () => {
    // Given
    recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(TestData.automatedRecallDecision())

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${journeyId}/review-sentences`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`,
    )
    expect($('#cancel-button').attr('href')).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`,
    )

    expect($('[data-qa=latest-sled]').text()).toContain(
      "The latest SLED (Sentence and licence expiry date) is 01 Dec 2025. This is the SLED on this person's licence.",
    )
    expect($('[data-qa=court-case-count]').text()).toContain('Court cases with sentences eligible for recall (1)')
    const offenceCardText = $('[data-qa=recallable-sentences]').text()
    expect(offenceCardText).toContain('OFF1 Offence 1')
    expect(offenceCardText).toContain('Standard Determinate')
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .get(`/person/${nomsId}/recall/create/${uuidv4()}/review-sentences`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})

describe('POST', () => {
  it('should redirect to check your answers', async () => {
    // Given
    calculateReleaseDatesService.makeDecisionForRecordARecall.mockResolvedValue(TestData.automatedRecallDecision())

    // When
    await request(app)
      .post(`/person/${nomsId}/recall/create/${journeyId}/review-sentences`)
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/${journeyId}/recall-type`)

    // Then
    expect(existingJourney.sentenceIds).toBeTruthy()
  })

  it('should return to start of journey if not found in session', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/create/${uuidv4()}/review-sentences`)
      .type('form')
      .send({ day: '1', month: '2' })
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/create/start`)
  })
})
