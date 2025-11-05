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

const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService(
  null,
) as jest.Mocked<CourtCasesReleaseDatesService>
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
    recallService.getRecallsForPrisoner.mockResolvedValue([])

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[aria-current=page]').text().trim()).toStrictEqual('Recalls')
  })

  it('should show no recalls hint if there are no recalls', async () => {
    // Given
    recallService.getRecallsForPrisoner.mockResolvedValue([])

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
    recallService.getRecallsForPrisoner.mockResolvedValue([middle, oldest, latest])

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
})
