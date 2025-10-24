import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import PrisonerSearchService from '../../services/prisonerSearchService'
import TestData from '../../testutils/testData'

jest.mock('../../services/courtCasesReleaseDatesService')
jest.mock('../../services/prisonerSearchService')

const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService(
  null,
) as jest.Mocked<CourtCasesReleaseDatesService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>

let app: Express
const nomsId = 'A1234BC'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerSearchService,
      courtCasesReleaseDatesService,
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
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should render home page with correct navigation', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[aria-current=page]').text().trim()).toStrictEqual('Recalls')
  })

  it('should show no recalls hint if there are no recalls', async () => {
    // Given

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
})
