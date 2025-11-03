import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import RecallService from '../../services/recallService'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import TestData from '../../testutils/testData'

let app: Express
const nomsId = 'A1234BC'

jest.mock('../../services/recallService')

const recallService = new RecallService(null, null, null, null, null) as jest.Mocked<RecallService>

beforeEach(() => {
  app = appWithAllRoutes({
    services: { recallService },
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  it('Should render the recall card and navigation', async () => {
    // Given
    const recall = TestData.existingRecall({
      createdAtTimestamp: '2021-03-19T13:40:56Z',
      createdAtLocationName: 'Kirkham (HMP)',
      canEdit: false,
      canDelete: false,
      source: 'DPS',
    })
    recallService.getRecall.mockResolvedValue(recall)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/${recall.recallUuid}/delete`)

    // Then
    expect(response.status).toEqual(200)
    const $ = cheerio.load(response.text)

    expect($('[data-qa=back-link]').attr('href')).toStrictEqual(`/person/${nomsId}`)
    const recallCards = $('.recall-card')
    expect(recallCards).toHaveLength(1)
    const firstCard = recallCards.eq(0)
    expect(firstCard.find('.govuk-summary-card__title').text().trim()).toStrictEqual(
      'Recorded on 19 Mar 2021 at Kirkham (HMP)',
    )
    expect(firstCard.find($('a:contains("Edit")'))).toHaveLength(0)
    expect(firstCard.find($('a:contains("Delete")'))).toHaveLength(0)
  })
})

describe('POST', () => {
  it('should return to the input page if there are validation errors', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/abc/delete`)
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', `/person/${nomsId}/recall/abc/delete#`)
  })

  it('should return to the home page without deleting if no was selected', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/abc/delete`)
      .type('form')
      .send({ confirmDeleteRecall: 'NO' })
      .expect(302)
      .expect('Location', `/person/${nomsId}`)

    expect(recallService.deleteRecall).not.toHaveBeenCalled()
  })

  it('should return to the home page without deleting if no was selected', async () => {
    await request(app)
      .post(`/person/${nomsId}/recall/abc/delete`)
      .type('form')
      .send({ confirmDeleteRecall: 'YES' })
      .expect(302)
      .expect('Location', `/person/${nomsId}`)

    expect(recallService.deleteRecall).toHaveBeenCalledWith('abc', 'user1')
  })
})
