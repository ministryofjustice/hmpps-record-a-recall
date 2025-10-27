import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import PrisonerSearchService from '../../services/prisonerSearchService'
import TestData from '../../testutils/testData'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonRegisterService from '../../services/prisonRegisterService'
import { Prison } from '../../@types/prisonRegisterApi/prisonRegisterTypes'

jest.mock('../../services/courtCasesReleaseDatesService')
jest.mock('../../services/prisonerSearchService')
jest.mock('../../services/remandAndSentencingService')
jest.mock('../../services/prisonRegisterService')

const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService(
  null,
) as jest.Mocked<CourtCasesReleaseDatesService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const prisonRegisterService = new PrisonRegisterService(null) as jest.Mocked<PrisonRegisterService>

let app: Express
const nomsId = 'A1234BC'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerSearchService,
      courtCasesReleaseDatesService,
      remandAndSentencingService,
      prisonRegisterService,
    },
    userSupplier: () => user,
  })
  prisonerSearchService.getPrisonerDetails.mockResolvedValue(TestData.prisoner({ prisonerNumber: nomsId }))
  courtCasesReleaseDatesService.getServiceDefinitions.mockResolvedValue({
    services: {
      overview: {
        href: 'https://cccard/prisoner/G2038UU/overview',
        text: 'Overview',
        thingsToDo: {
          count: 0,
        },
      },
      recalls: {
        href: 'https://recalls/person/G2038UU',
        text: 'Recalls',
        thingsToDo: {
          count: 0,
        },
      },
      releaseDates: {
        href: 'https://crds?prisonId=G2038UU',
        text: 'Release dates and calculations',
        thingsToDo: {
          count: 0,
        },
      },
    },
  })
  prisonRegisterService.getPrisonNames.mockResolvedValue([
    { prisonId: 'BXI', prisonName: 'Brixton (HMP)' } as unknown as Prison,
    { prisonId: 'KMI', prisonName: 'Kirkham (HMP)' } as unknown as Prison,
    { prisonId: 'MDI', prisonName: 'Moorland (HMP & YOI)' } as unknown as Prison,
  ])
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should render home page with correct navigation', async () => {
    // Given
    remandAndSentencingService.getAllRecalls.mockResolvedValue([])

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[aria-current=page]').text().trim()).toStrictEqual('Recalls')
  })

  it('should show no recalls hint if there are no recalls', async () => {
    // Given
    remandAndSentencingService.getAllRecalls.mockResolvedValue([])

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

  it('should show recalls sorted by most recent and only the latest should be editable', async () => {
    // Given
    const latest = TestData.apiRecall({
      prisonerId: nomsId,
      createdAt: '2021-03-19T13:40:56Z',
      createdByPrison: 'KMI',
      source: 'DPS',
    })
    const middle = TestData.apiRecall({
      prisonerId: nomsId,
      createdAt: '2020-02-26T13:40:56Z',
      createdByPrison: 'MDI',
      source: 'DPS',
    })
    const oldest = TestData.apiRecall({
      prisonerId: nomsId,
      createdAt: '2019-01-18T13:40:56Z',
      createdByPrison: undefined,
      source: 'DPS',
    })
    remandAndSentencingService.getAllRecalls.mockResolvedValue([middle, oldest, latest])

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
    expect(secondCard.find($(deleteSelector))).toHaveLength(1)
    const thirdCard = recallCards.eq(2)
    expect(thirdCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual('Recorded on 18 Jan 2019')
    expect(thirdCard.find($(editSelector))).toHaveLength(0)
    expect(thirdCard.find($(deleteSelector))).toHaveLength(1)
  })

  it('should not allow NOMIS recalls to be edited or deleted', async () => {
    // Given
    const latest = TestData.apiRecall({ prisonerId: nomsId, createdAt: '2021-03-19T13:40:56Z', source: 'NOMIS' })
    remandAndSentencingService.getAllRecalls.mockResolvedValue([latest])

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=no-recalls-hint]')).toHaveLength(0)
    const recallCards = $('.recall-card')
    expect(recallCards).toHaveLength(1)
    const firstCard = recallCards.eq(0)
    expect(firstCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual('Recorded on 19 Mar 2021')
    expect(firstCard.find($('a:contains("Edit")'))).toHaveLength(0)
    expect(firstCard.find($('a:contains("Delete")'))).toHaveLength(0)
  })
})
