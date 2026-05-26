import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import PrisonerSearchService from '../../services/prisonerSearchService'
import TestData from '../../testutils/testData'
import RecallService from '../../services/recallService'
import AuditService from '../../services/auditService'

jest.mock('../../services/courtCasesReleaseDatesService')
jest.mock('../../services/prisonerSearchService')
jest.mock('../../services/recallService')
jest.mock('../../services/auditService')

const courtCasesReleaseDatesService = {
  getServiceDefinitions: jest.fn().mockResolvedValue(TestData.serviceDefinitions()),
} as unknown as jest.Mocked<CourtCasesReleaseDatesService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express
const nomsId = 'A1234BC'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerSearchService,
      courtCasesReleaseDatesService,
      recallService,
      auditService,
    },
    userSupplier: () => user,
  })
  prisonerSearchService.getPrisonerDetails.mockResolvedValue(TestData.prisoner({ prisonerNumber: nomsId }))
  courtCasesReleaseDatesService.getServiceDefinitions.mockResolvedValue(TestData.serviceDefinitions())
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should render home page with correct navigation', async () => {
    // Given
    recallService.getRecallsForPrisoner.mockResolvedValue(TestData.recallsForPrisoner([]))

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[aria-current=page]').text().trim()).toStrictEqual('Recalls')
  })

  it('should show no recalls hint if there are no recalls', async () => {
    // Given
    recallService.getRecallsForPrisoner.mockResolvedValue(TestData.recallsForPrisoner([]))

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=no-recalls-hint]').text().trim()).toStrictEqual('There are no recalls recorded.')
    const createButton = $('[data-qa=create-new-recall-btn]')
    expect(createButton.text().trim()).toStrictEqual('Record a recall')
    expect(createButton.attr('href')).toStrictEqual(`/person/${nomsId}/recall/create/start`)
  })

  it('should show recalls sorted by most recent with edit and delete as per service', async () => {
    // Given
    const latest = TestData.existingRecall({
      createdAtTimestamp: '2021-03-19T13:40:56Z',
      createdAtLocationName: 'Kirkham (HMP)',
      canEdit: true,
      canDelete: true,
      source: 'DPS',
    })
    const middle = TestData.existingRecall({
      createdAtTimestamp: '2020-02-26T13:40:56Z',
      createdAtLocationName: 'Moorland (HMP & YOI)',
      canEdit: false,
      canDelete: false,
      source: 'DPS',
    })
    const oldest = TestData.existingRecall({
      createdAtTimestamp: '2019-01-18T13:40:56Z',
      createdAtLocationName: undefined,
      canEdit: false,
      canDelete: false,
      source: 'DPS',
    })
    recallService.getRecallsForPrisoner.mockResolvedValue(TestData.recallsForPrisoner([latest, middle, oldest]))

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=no-recalls-hint]')).toHaveLength(0)
    const recallCards = $('.recall-card')
    const editSelector = 'a:contains("Edit")'
    const deleteSelector = 'a:contains("Delete")'
    expect(recallCards).toHaveLength(3)
    const firstCard = recallCards.eq(0)
    expect(firstCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual(
      'Recorded on 19 Mar 2021 at Kirkham (HMP)',
    )
    expect(firstCard.find($(editSelector))).toHaveLength(1)
    expect(firstCard.find($(deleteSelector))).toHaveLength(1)
    const secondCard = recallCards.eq(1)
    expect(secondCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual(
      'Recorded on 26 Feb 2020 at Moorland (HMP & YOI)',
    )
    expect(secondCard.find($(editSelector))).toHaveLength(0)
    expect(secondCard.find($(deleteSelector))).toHaveLength(0)
    const thirdCard = recallCards.eq(2)
    expect(thirdCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual('Recorded on 18 Jan 2019')
    expect(thirdCard.find($(editSelector))).toHaveLength(0)
    expect(thirdCard.find($(deleteSelector))).toHaveLength(0)
  })

  it('should show trvotd-recall notification banner when coming from unknown-pre-recall journey', async () => {
    // Given
    recallService.getRecallsForPrisoner.mockResolvedValue(TestData.recallsForPrisoner([]))

    // When
    const response = await request(app).get(`/person/${nomsId}?unknownPreRecallJourney=true`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa="record-recall-notification-panel"]')).toHaveLength(1)
  })

  it('should show filter and recall counts when recalls exist', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue(
      TestData.prisoner({ prisonerNumber: nomsId, bookingId: '1233536' }),
    )
    recallService.getRecallsForPrisoner.mockResolvedValue(
      TestData.recallsForPrisoner([
        TestData.existingRecall({
          courtCases: [{ courtCaseUuid: 'cc-1', sentences: [] }],
        }),
      ]),
    )

    const response = await request(app).get(`/person/${nomsId}`)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=filter-previous-periods-of-custody]')).toHaveLength(1)
    expect($('[data-qa=recalls-showing-count]').text().replace(/\s+/g, ' ').trim()).toBe('Showing 1 of 1 recalls')
    expect($('[data-qa=no-recalls-hint]')).toHaveLength(0)
  })

  it('should show empty current period message when recalls exist only on other bookings', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue(
      TestData.prisoner({ prisonerNumber: nomsId, bookingId: '1233536' }),
    )
    recallService.getRecallsForPrisoner.mockResolvedValue(TestData.recallsForPrisoner([], 1))

    const response = await request(app).get(`/person/${nomsId}`)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=recalls-showing-count]').text().replace(/\s+/g, ' ').trim()).toBe('Showing 0 of 1 recalls')
    expect($('[data-qa=no-recalls-in-current-period-hint]').text().trim()).toBe(
      'There are no recalls recorded for this period of custody for John Smith.',
    )
    expect($('.recall-card')).toHaveLength(0)
  })

  it('should show all recalls when include previous periods filter is applied', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue(
      TestData.prisoner({ prisonerNumber: nomsId, bookingId: '1233536' }),
    )
    const currentRecall = TestData.existingRecall({
      createdAtTimestamp: '2024-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-current', sentences: [] }],
    })
    const previousRecall = TestData.existingRecall({
      createdAtTimestamp: '2023-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-previous', sentences: [] }],
    })
    recallService.getRecallsForPrisoner.mockResolvedValue(
      TestData.recallsForPrisoner([currentRecall, previousRecall], 2),
    )

    const response = await request(app).get(`/person/${nomsId}?includeRecallsFromPreviousPeriodsOfCustody=true`)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=recalls-showing-count]').text().replace(/\s+/g, ' ').trim()).toBe('Showing 2 of 2 recalls')
    expect($('.recall-card')).toHaveLength(2)
  })

  it('returns to current period view when filter is unchecked and applied', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue(
      TestData.prisoner({ prisonerNumber: nomsId, bookingId: '1233536' }),
    )
    const currentRecall = TestData.existingRecall({
      createdAtTimestamp: '2024-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-current', sentences: [] }],
    })
    const previousRecall = TestData.existingRecall({
      createdAtTimestamp: '2023-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-previous', sentences: [] }],
    })
    recallService.getRecallsForPrisoner.mockImplementation((_nomsId, _user, _bookingId, includeAllPeriods) => {
      if (includeAllPeriods) {
        return Promise.resolve(TestData.recallsForPrisoner([currentRecall, previousRecall], 2))
      }
      return Promise.resolve(TestData.recallsForPrisoner([currentRecall], 2))
    })

    const response = await request(app).get(`/person/${nomsId}?includeRecallsFromPreviousPeriodsOfCustody=true`)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=recalls-showing-count]').text().replace(/\s+/g, ' ').trim()).toBe('Showing 2 of 2 recalls')

    const filteredResponse = await request(app).get(`/person/${nomsId}`)
    const filtered$ = cheerio.load(filteredResponse.text)
    expect(filtered$('[data-qa=recalls-showing-count]').text().replace(/\s+/g, ' ').trim()).toBe(
      'Showing 1 of 2 recalls',
    )
    expect(filtered$('.recall-card')).toHaveLength(1)
  })
})
