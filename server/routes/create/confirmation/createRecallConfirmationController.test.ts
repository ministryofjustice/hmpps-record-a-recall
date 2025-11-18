import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'

let app: Express
const nomsId = 'A1234BC'
const recallId: string = uuidv4()

jest.mock('../../../services/auditService')
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('should render confirmation create page', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/${recallId}/confirmed`)

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const mainContent = $('#main-content')
    expect(mainContent.text()).not.toContain('Recall edited')
    expect(mainContent.text()).toContain('Recall recorded')

    const links = mainContent.find('a')
    expect(links.eq(0).text()).toContain('Check the adjustments information')
    expect(links.eq(0).attr('href')).toContain('https://adjustments-dev.hmpps.service.justice.gov.uk/A1234BC')

    expect(links.eq(1).text()).toContain('Calculate release dates')
    expect(links.eq(1).attr('href')).toContain(
      'https://calculate-release-dates-dev.hmpps.service.justice.gov.uk?prisonId=A1234BC',
    )

    expect(links.eq(2).text()).toContain('prisoner profile')
    expect(links.eq(2).attr('href')).toContain(
      'https://court-cases-release-dates-dev.hmpps.service.justice.gov.uk/prisoner/A1234BC/overview',
    )
  })

  it('should render confirmation edit page', async () => {
    // Given

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/confirmed`)

    // Then
    expect(response.status).toEqual(200)
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    const mainContent = $('#main-content')
    expect(mainContent.text()).not.toContain('Recall recorded')
    expect(mainContent.text()).toContain('Recall edited')
  })
})
