import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import AuditService from '../../../services/auditService'
import config from '../../../config'

let app: Express
const nomsId = 'A1234BC'

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
  it('should render no-sentences intercept page correctly', async () => {
    const response = await request(app).get(`/person/${nomsId}/recall/create/no-sentences`)

    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)
    expect($('[data-qa=main-heading]').text()).toStrictEqual('There are no sentences recorded')
    expect($('[data-qa=main-text]').text().replace(/\s+/g, ' ').trim()).toStrictEqual(
      'To record a recall you must enter active sentence information in court cases and try again',
    )
    expect($('[data-qa=court-cases-link]').attr('href')).toStrictEqual(
      `${config.urls.remandAndSentencing}/person/A1234BC`,
    )
    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(`/person/${nomsId}`)
  })
})
