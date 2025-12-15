/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import * as cheerio from 'cheerio'
import { RecallJourney, DecoratedCourtCase } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import TestData from '../../../../testutils/testData'
import RecallJourneyUrls from '../../recallJourneyUrls'
import AuditService from '../../../../services/auditService'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
jest.mock('../../../../services/auditService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }

  app = appWithAllRoutes({
    services: { recallService, auditService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.recallJourneys = {}
      receivedSession.recallJourneys[journeyId] = existingJourney
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

  recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])
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
      expect($('#cancel-button').attr('href')).toStrictEqual(
        `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel?returnKey=manualSelectCases&caseIndex=0`,
      )
    })

    describe('backlink tests', () => {
      it('shows back link to check answers when journey.isCheckingAnswers is true', async () => {
        existingJourney.isCheckingAnswers = true

        const res = await request(app).get(baseUrl)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(
          RecallJourneyUrls.checkAnswers(nomsId, journeyId, 'create', null),
        )
      })

      it('shows back link to previous case when not checking answers and index > 0', async () => {
        recallService.getRecallableCourtCases.mockResolvedValue([
          TestData.recallableCourtCase(),
          TestData.recallableCourtCase(),
        ])
        const courtCaseIndex = 2

        const res = await request(app).get(`${baseUrl}/${courtCaseIndex}`)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(
          RecallJourneyUrls.manualSelectCases(nomsId, journeyId, 'create', null, courtCaseIndex - 1),
        )
      })

      it('shows back link to journey start when not checking answers and index = 0', async () => {
        const courtCaseIndex = 0

        const res = await request(app).get(`${baseUrl}?index=${courtCaseIndex}`)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(
          RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, 'create', null),
        )
      })
    })

    describe('Form values are preselected if the page is revisited', () => {
      it('selects the YES radio when the case is in courtCaseIdsSelectedForRecall', async () => {
        const courtCase = TestData.recallableCourtCase()
        recallService.getRecallableCourtCases.mockResolvedValue([courtCase])
        delete existingJourney.courtCaseIdsExcludedFromRecall
        existingJourney.courtCaseIdsSelectedForRecall = [courtCase.courtCaseUuid]

        const res = await request(app).get(baseUrl)
        const $ = cheerio.load(res.text)

        expect($('[data-qa="yes-radio"]').attr('checked')).toBe('checked')
        expect($('[data-qa="no-radio"]').attr('checked')).toBeUndefined()
      })

      it('selects the NO radio when the case is in courtCaseIdsSelectedForRecall', async () => {
        const courtCase = TestData.recallableCourtCase()
        recallService.getRecallableCourtCases.mockResolvedValue([courtCase])
        existingJourney.courtCaseIdsExcludedFromRecall = [courtCase.courtCaseUuid]
        delete existingJourney.courtCaseIdsSelectedForRecall

        const res = await request(app).get(baseUrl)
        const $ = cheerio.load(res.text)

        expect($('[data-qa="yes-radio"]').attr('checked')).toBeUndefined()
        expect($('[data-qa="no-radio"]').attr('checked')).toBe('checked')
      })

      it('selects neither radio when the case hasnt been visited before', async () => {
        const courtCase = TestData.recallableCourtCase()
        recallService.getRecallableCourtCases.mockResolvedValue([courtCase])
        delete existingJourney.courtCaseIdsExcludedFromRecall
        delete existingJourney.courtCaseIdsSelectedForRecall

        const res = await request(app).get(baseUrl)
        const $ = cheerio.load(res.text)

        expect($('[data-qa="yes-radio"]').attr('checked')).toBeUndefined()
        expect($('[data-qa="no-radio"]').attr('checked')).toBeUndefined()
      })
    })
  })

  describe('POST', () => {
    const selectCasesUrl = (caseIndex?: number, createOrEdit: 'create' | 'edit' = 'create') =>
      RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, null, caseIndex)

    beforeEach(() => {
      existingJourney.courtCaseIdsSelectedForRecall = []
      existingJourney.recallableCourtCases = undefined as DecoratedCourtCase[]
    })

    it('YES on a middle case: stores UUID and redirects to next case', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
        { courtCaseUuid: 'uuid-3' },
      ] as DecoratedCourtCase[]

      const res = await request(app).post(selectCasesUrl(1)).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(selectCasesUrl(2))
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-2'])
    })

    it('NO on a middle case: skips storing and redirects to next case', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
        { courtCaseUuid: 'uuid-3' },
      ] as DecoratedCourtCase[]

      const res = await request(app).post(selectCasesUrl(1)).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(res.header.location).toBe(selectCasesUrl(2))
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual([])
    })

    it('YES on last case: stores UUID and goes to next step', async () => {
      existingJourney.recallableCourtCases = [{ courtCaseUuid: 'uuid-1' }] as DecoratedCourtCase[]

      const res = await request(app).post(selectCasesUrl(0)).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
      expect(existingJourney.courtCaseIdsExcludedFromRecall).toEqual([])
    })

    it('NO on last case: does not store and goes to next step', async () => {
      existingJourney.recallableCourtCases = [{ courtCaseUuid: 'uuid-1' }] as DecoratedCourtCase[]

      const res = await request(app).post(selectCasesUrl(0)).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(res.header.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/manual/no-cases-selected`)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual([])
    })

    it('NO removes existing case UUID from selected list', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
      ] as DecoratedCourtCase[]
      existingJourney.courtCaseIdsSelectedForRecall = ['uuid-1', 'uuid-2']

      await request(app).post(selectCasesUrl(1)).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
      expect(existingJourney.courtCaseIdsExcludedFromRecall).toEqual(['uuid-2'])
    })

    it('When editing redirects to next case in edit journey', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
        { courtCaseUuid: 'uuid-3' },
      ] as DecoratedCourtCase[]

      const res = await request(app).post(selectCasesUrl(1, 'edit')).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(selectCasesUrl(2, 'edit'))
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-2'])
    })
    it('When editing the last case and the answer is changed, redirects to select recall type', async () => {
      existingJourney.isCheckingAnswers = true
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
      ] as DecoratedCourtCase[]

      // user had previously selected both cases
      existingJourney.courtCaseIdsSelectedForRecall = ['uuid-1', 'uuid-2']
      existingJourney.courtCaseIdsExcludedFromRecall = []

      const res = await request(app).post(selectCasesUrl(1, 'edit')).send({ activeSentenceChoice: 'NO' }).expect(302)

      expect(res.header.location).toBe(RecallJourneyUrls.recallType(nomsId, journeyId, 'edit', null))
      expect(existingJourney.isCheckingAnswers).toBe(false)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
      expect(existingJourney.courtCaseIdsExcludedFromRecall).toEqual(['uuid-2'])
    })

    it('When editing and a non-final case answer is changed, final submission redirects to select recall type', async () => {
      existingJourney.isCheckingAnswers = true
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1' },
        { courtCaseUuid: 'uuid-2' },
      ] as DecoratedCourtCase[]

      existingJourney.courtCaseIdsSelectedForRecall = ['uuid-1', 'uuid-2']
      existingJourney.courtCaseIdsExcludedFromRecall = []

      // Change first case
      await request(app).post(selectCasesUrl(0, 'edit')).send({ activeSentenceChoice: 'NO' }).expect(302)

      const res = await request(app).post(selectCasesUrl(1, 'edit')).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(RecallJourneyUrls.recallType(nomsId, journeyId, 'edit', null))
    })

    it('When editing the last case and the answer is unchanged, redirects back to check answers', async () => {
      existingJourney.isCheckingAnswers = true
      existingJourney.recallableCourtCases = [{ courtCaseUuid: 'uuid-1' }] as DecoratedCourtCase[]
      existingJourney.courtCaseIdsSelectedForRecall = ['uuid-1']
      existingJourney.courtCaseIdsExcludedFromRecall = []

      const res = await request(app).post(selectCasesUrl(0, 'edit')).send({ activeSentenceChoice: 'YES' }).expect(302)

      expect(res.header.location).toBe(RecallJourneyUrls.checkAnswers(nomsId, journeyId, 'edit', null))
      expect(existingJourney.isCheckingAnswers).toBe(true)
      expect(existingJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
      expect(existingJourney.courtCaseIdsExcludedFromRecall).toEqual([])
    })
  })
})
