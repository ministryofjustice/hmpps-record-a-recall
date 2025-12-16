/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import * as cheerio from 'cheerio'
import { RecallJourney, DecoratedCourtCase } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import { RecallableCourtCase } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import TestData from '../../../../testutils/testData'
import CalculateReleaseDatesService from '../../../../services/calculateReleaseDatesService'
import CourtCasesReleaseDatesService from '../../../../services/courtCasesReleaseDatesService'
import AuditService from '../../../../services/auditService'
import RecallJourneyUrls from '../../recallJourneyUrls'

let app: Express
let existingJourney: RecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
jest.mock('../../../../services/calculateReleaseDatesService')
jest.mock('../../../../services/courtCasesReleaseDatesService')
jest.mock('../../../../services/auditService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService(
  null,
) as jest.Mocked<CourtCasesReleaseDatesService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

const s1 = TestData.recallableSentence({ offenceCode: 'OFF1', offenceDescription: 'Offence 1' })
const s2 = TestData.recallableSentence({ offenceCode: 'OFF2', offenceDescription: 'Offence 2' })
const s3 = TestData.recallableSentence({ offenceCode: 'OFF3', offenceDescription: 'Offence 3' })

const courtCase1 = TestData.recallableCourtCase([s1, s2], [], {
  courtCaseUuid: 'uuid-1',
  reference: 'REF-1',
} as RecallableCourtCase)
const courtCase2 = TestData.recallableCourtCase([s3], [], {
  courtCaseUuid: 'uuid-2',
  reference: 'REF-2',
} as RecallableCourtCase)

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
    recallableCourtCases: [courtCase1, courtCase2],
  }
  app = appWithAllRoutes({
    services: { recallService, calculateReleaseDatesService, courtCasesReleaseDatesService, auditService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.recallJourneys = {}
      receivedSession.recallJourneys[journeyId] = existingJourney
    },
  })

  recallService.getCasesSelectedForRecall.mockReturnValue([courtCase1, courtCase2])
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('checkSentencesController Tests', () => {
  const baseUrl = `/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`

  describe('GET', () => {
    it('renders the first recallable court case (index defaults to 0) and shows recallable/non-recallable sections', async () => {
      // Given
      calculateReleaseDatesService.getLedFromLatestCalc.mockResolvedValue('2024-02-03')
      courtCasesReleaseDatesService.getServiceDefinitions.mockResolvedValue(TestData.serviceDefinitions())

      // When
      const res = await request(app).get(baseUrl).expect(200)

      // Then
      const $ = cheerio.load(res.text)

      const ledLine = $('[data-qa="led-line"]').text().replace(/\s+/g, ' ').trim()
      expect(ledLine).toBe(
        "The latest SLED (Sentence and licence expiry date) is 03 Feb 2024. This is the SLED on this person's licence.",
      )

      const headings = $('h2[data-qa="court-case-main-heading"]')
      // --- First case ---
      const firstHeadingText = $(headings[0]).text().replace(/\s+/g, ' ').trim()
      expect(firstHeadingText).toBe('REF-1 at Default Court Name on 01/01/2025')

      const firstCaseSiblings = $(headings[0]).nextUntil('h2[data-qa="court-case-main-heading"]')

      const firstCaseCards = firstCaseSiblings.filter('.offence-card.sentence-card')
      expect(firstCaseCards.length).toBe(2)

      const card1 = firstCaseCards.eq(0)
      expect(card1.find('h4.govuk-heading-s').text()).toContain('OFF1')
      expect(card1.find('h4.govuk-heading-s').text()).toContain('Offence 1')

      const card2 = firstCaseCards.eq(1)
      expect(card2.find('h4.govuk-heading-s').text()).toContain('OFF2')
      expect(card2.find('h4.govuk-heading-s').text()).toContain('Offence 2')

      // --- Second case ---
      const secondHeadingText = $(headings[1]).text().replace(/\s+/g, ' ').trim()
      expect(secondHeadingText).toBe('REF-2 at Default Court Name on 01/01/2025')

      const secondCaseSiblings = $(headings[1]).nextUntil('h2[data-qa="court-case-main-heading"]')

      const secondCaseCards = secondCaseSiblings.filter('.offence-card.sentence-card')
      expect(secondCaseCards.length).toBe(1)

      const onlyCard = secondCaseCards.eq(0)
      expect(onlyCard.find('h4.govuk-heading-s').text()).toContain('OFF3')
      expect(onlyCard.find('h4.govuk-heading-s').text()).toContain('Offence 3')
    })

    describe('backlink tests', () => {
      it('shows back link to check answers when journey.isCheckingAnswers is true', async () => {
        recallService.getCasesSelectedForRecall.mockReturnValue([courtCase1, courtCase2])
        existingJourney.isCheckingAnswers = true

        const res = await request(app).get(baseUrl)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(
          RecallJourneyUrls.checkAnswers(nomsId, journeyId, 'create', null),
        )
      })

      it('shows back link to previous case when not checking answers', async () => {
        const courtCaseIndex = 2

        const res = await request(app).get(baseUrl)

        const $ = cheerio.load(res.text)
        expect($('[data-qa="back-link"]').attr('href')).toBe(
          RecallJourneyUrls.manualSelectCases(nomsId, journeyId, 'create', null, courtCaseIndex - 1),
        )
      })
    })
  })

  describe('POST', () => {
    beforeEach(() => {
      existingJourney.courtCaseIdsSelectedForRecall = []
      existingJourney.recallableCourtCases = undefined as DecoratedCourtCase[]
    })

    it('Builds sentenceIds from recallable sentences of selected court cases', async () => {
      existingJourney.recallableCourtCases = [
        { courtCaseUuid: 'uuid-1', recallableSentences: [{ sentenceUuid: 'sent-uuid-1' }] },
        { courtCaseUuid: 'uuid-2', recallableSentences: [] },
      ] as DecoratedCourtCase[]
      existingJourney.courtCaseIdsSelectedForRecall = ['uuid-1', 'uuid-2']

      const res = await request(app).post(baseUrl).expect(302)

      expect(res.header.location).toBe(`/person/${nomsId}/recall/create/${journeyId}/recall-type`)
      expect(existingJourney.sentenceIds).toEqual(['sent-uuid-1'])
    })
  })
})
