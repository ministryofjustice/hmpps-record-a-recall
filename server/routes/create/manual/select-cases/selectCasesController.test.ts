/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import * as cheerio from 'cheerio'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import { RecallableCourtCase } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import TestData from '../../../../testutils/testData'
import CreateRecallUrls from '../../createRecallUrls'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
const recallService = new RecallService(null, null, null, null, null) as jest.Mocked<RecallService>

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
    services: { recallService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.createRecallJourneys = {}
      receivedSession.createRecallJourneys[journeyId] = existingJourney
    },
  })
  app.use((req, res, next) => {
    res.locals.user = {
      authSource: 'azuread',
      userId: 'user1-id',
      username: 'user1',
      name: 'User One',
      displayName: 'User One',
      userRoles: ['RECORDER'],
      token: 'fake-token',
    }
    next()
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('selectCasesController Tests', () => {
  const baseUrl = `/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases`

  describe('GET', () => {
    it('renders the first recallable court case (index defaults to 0) and shows recallable/non-recallable sections', async () => {
      // Given
      const s1 = TestData.recallableSentence({ offenceCode: 'OFF1', offenceDescription: 'Offence 1' })
      const s2 = TestData.nonRecallableSentence({ offenceCode: 'OFF2', offenceDescription: 'Offence 2' })
      const s3 = TestData.recallableSentence({ offenceCode: 'OFF3', offenceDescription: 'Offence 3' })

      recallService.getRecallableCourtCases.mockResolvedValue([
        TestData.recallableCourtCase([s1], [s2], { courtCaseUuid: 'uuid-1', reference: 'REF-1' }),
        TestData.recallableCourtCase([s3], [], { courtCaseUuid: 'uuid-2', reference: 'REF-2' }),
      ])

      // When
      const res = await request(app).get(baseUrl).expect(200)

      // Then
      const $ = cheerio.load(res.text)

      expect(recallService.getRecallableCourtCases).toHaveBeenCalledWith(nomsId, 'user1')
      expect(res.text).toContain('Select all cases that had an active sentence')
      expect(res.text).toContain('Court case 1 of 2')
      expect(res.text).toContain('View offences which are not eligible for recall (1)')

      const recallableText = $('[data-qa="recallable-sentences"]').text()
      expect(recallableText).toContain('OFF1')
      expect(recallableText).toContain('Offence 1')

      const nonRecallableText = $('[data-qa="non-recallable-sentences"]').text()
      expect(nonRecallableText).toContain('OFF2')
      expect(nonRecallableText).toContain('Offence 2')
    })
  })

  describe('POST', () => {
    const selectCasesUrl = (caseIndex?: number) => CreateRecallUrls.manualSelectCases(nomsId, journeyId, caseIndex)

    beforeEach(() => {
      existingJourney.courtCaseIdsSelectedForRecall = []
      existingJourney.recallableCourtCases = undefined as RecallableCourtCase[]
    })

    it('YES on a middle case: stores UUID and redirects to next case', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
        { courtCaseUuid: 'uuid-3' },
      ] as RecallableCourtCase[]

      const res = await request(app).post(selectCasesUrl(1)).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(selectCasesUrl(2))
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-2'])
    })

    it('NO on a middle case: skips storing and redirects to next case', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
        { courtCaseUuid: 'uuid-3' },
      ] as RecallableCourtCase[]

      const res = await request(app).post(selectCasesUrl(1)).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(res.header.location).toBe(selectCasesUrl(2))
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual([])
    })

    it('YES on last case: stores UUID and goes to next step', async () => {
      existingJourney.recallableCourtCases = [{ courtCaseUuid: 'uuid-1' }] as RecallableCourtCase[]

      const res = await request(app).post(selectCasesUrl(0)).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
    })

    it('NO on last case: does not store and goes to next step', async () => {
      existingJourney.recallableCourtCases = [{ courtCaseUuid: 'uuid-1' }] as RecallableCourtCase[]

      const res = await request(app).post(selectCasesUrl(0)).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(res.header.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual([])
    })
  })
})
