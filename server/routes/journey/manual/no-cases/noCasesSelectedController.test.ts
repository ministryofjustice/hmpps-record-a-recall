/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import AuditService from '../../../../services/auditService'
import TestData from '../../../../testutils/testData'
import RecallJourneyUrls from '../../recallJourneyUrls'

jest.mock('../../../../services/recallService')
jest.mock('../../../../services/auditService')

const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express
const nomsId = 'A1234BC'
const journeyId = 'test-journey-id'

beforeEach(() => {
  app = appWithAllRoutes({
    services: { recallService, auditService },
    userSupplier: () => user,
    sessionReceiver: session => {
      const journeys = {} as typeof session.recallJourneys
      journeys[journeyId] = {
        id: journeyId,
        nomsId,
        lastTouched: new Date().toISOString(),
        revocationDate: { day: 11, month: 11, year: 2025 },
        isCheckingAnswers: false,
        crdsValidationResult: {
          criticalValidationMessages: [],
          otherValidationMessages: [],
          earliestSentenceDate: '2025-01-01',
        },
      }
      session.recallJourneys = journeys
    },
  })

  const prisoner = TestData.prisoner({ prisonerNumber: nomsId })
  app.use((req, res, next) => {
    res.locals.user = user
    res.locals.prisoner = prisoner
    next()
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('NoCasesSelectedController', () => {
  const url = `/person/${nomsId}/recall/create/${journeyId}/manual/no-cases-selected`

  it('renders page with prisoner name and revocation date', async () => {
    const res = await request(app).get(url).expect(200)
    const $ = cheerio.load(res.text)

    expect($('h1').text()).toContain('No cases have been selected')
    expect($('strong').text()).toBe('11 November 2025')
  })

  it('sets correct links using RecallJourneyUrls', async () => {
    const res = await request(app).get(url).expect(200)

    const manualBase = RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, 'create', '')
    const revocationUrl = RecallJourneyUrls.revocationDate(nomsId, journeyId, 'create', '')
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      'create',
      '',
      RecallJourneyUrls.manualSelectCases.name,
    )

    expect(res.text).toContain(manualBase)
    expect(res.text).toContain(revocationUrl)
    expect(res.text).toContain(cancelLink)
  })

  it('handles missing recallId gracefully', async () => {
    const urlWithoutRecallId = `/person/${nomsId}/recall/create/${journeyId}/manual/no-cases-selected`
    const res = await request(app).get(urlWithoutRecallId).expect(200)

    const manualBase = RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, 'create', undefined)
    const revocationUrl = RecallJourneyUrls.revocationDate(nomsId, journeyId, 'create', undefined)

    expect(res.text).toContain(manualBase)
    expect(res.text).toContain(revocationUrl)
  })

  it('renders empty revocation date if not set', async () => {
    app = appWithAllRoutes({
      services: { recallService, auditService },
      userSupplier: () => user,
      sessionReceiver: session => {
        const journeys = {} as typeof session.recallJourneys
        journeys[journeyId] = {
          id: journeyId,
          nomsId,
          lastTouched: new Date().toISOString(),
          isCheckingAnswers: false,
          crdsValidationResult: {
            criticalValidationMessages: [],
            otherValidationMessages: [],
            earliestSentenceDate: '2025-01-01',
          },
        }
        session.recallJourneys = journeys
      },
    })

    const res = await request(app).get(url).expect(200)
    const $ = cheerio.load(res.text)

    expect($('strong').text()).toBe('')
  })
})
