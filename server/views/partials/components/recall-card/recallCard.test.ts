import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import RecallCardModel from './RecallCardModel'
import { formatDate } from '../../../../utils/utils'
import TestData from '../../../../testutils/testData'

const njkEnv = nunjucks.configure([
  __dirname,
  'node_modules/govuk-frontend/dist/',
  'node_modules/govuk-frontend/dist/components/',
])
njkEnv.addFilter('formatDate', formatDate)

const aRecall: RecallCardModel = {
  recallUuid: 'abc123',
  source: 'DPS',
  createdAtTimestamp: '2021-02-03T13:21:00Z',
  createdAtLocationName: 'HMP Brixton',
  canEdit: false,
  canDelete: false,
  recallTypeDescription: 'Standard Recall',
  revocationDate: '2021-02-01',
}

const serviceDefinitions = TestData.serviceDefinitions()

describe('Tests for recall card component', () => {
  it.each([
    [{ ...aRecall, createdAtLocationName: undefined }, 'Recorded on 03 Feb 2021'],
    [{ ...aRecall, createdAtLocationName: 'HMP Brixton' }, 'Recorded on 03 Feb 2021 at HMP Brixton'],
  ])('Should show heading with location if present (%j, %s)', (model: RecallCardModel, expectedTitle) => {
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-card-title]').text().trim()).toStrictEqual(expectedTitle)
  })

  it('Should show NOMIS badge with no actions if source is NOMIS', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-nomis-badge]')).toHaveLength(1)
  })

  it.each([
    [
      { ...aRecall, source: 'DPS', canEdit: true, canDelete: true },
      '#edit',
      'Edit recall recorded on 03 Feb 2021',
      '#delete',
      'Delete recall recorded on 03 Feb 2021',
    ],
    [
      { ...aRecall, source: 'DPS', canEdit: false, canDelete: true },
      undefined,
      undefined,
      '#delete',
      'Delete recall recorded on 03 Feb 2021',
    ],
    [
      { ...aRecall, source: 'DPS', canEdit: true, canDelete: false },
      '#edit',
      'Edit recall recorded on 03 Feb 2021',
      undefined,
      undefined,
    ],
    [{ ...aRecall, source: 'DPS', canEdit: false, canDelete: false }, undefined, undefined, undefined, undefined],
  ])(
    'Should show actions links if source is DPS and actions are allowed',
    (model: RecallCardModel, expectedEditLink, expectedEditText, expectedDeleteLink, expectedDeleteText) => {
      const content = nunjucks.render('test.njk', { model, serviceDefinitions })
      const $ = cheerio.load(content)
      expect($('[data-qa=recall-abc123-nomis-badge]')).toHaveLength(0)
      const editLink = $('[data-qa=recall-abc123-edit-link]')
      if (expectedEditLink) {
        expect(editLink.text().trim()).toStrictEqual(expectedEditText)
        expect(editLink.attr('href')).toStrictEqual(expectedEditLink)
      } else {
        expect(editLink).toHaveLength(0)
      }
      const deleteLink = $('[data-qa=recall-abc123-delete-link]')
      if (expectedDeleteLink) {
        expect(deleteLink.text().trim()).toStrictEqual(expectedDeleteText)
        expect(deleteLink.attr('href')).toStrictEqual(expectedDeleteLink)
      } else {
        expect(deleteLink).toHaveLength(0)
      }
    },
  )

  it('Should show recall type', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'DPS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Recall type")').next().text().trim()).toStrictEqual('Standard Recall')
  })

  it('Should show not entered for revocation date if source is NOMIS', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Revocation date")').next().text().trim()).toStrictEqual('Not entered')
  })

  it('Should show the revocation date if source is DPS', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'DPS',
      revocationDate: '2031-03-10',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Revocation date")').next().text().trim()).toStrictEqual('10 Mar 2031')
  })

  it('Should show the return to custody date if present', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'DPS',
      returnToCustodyDate: '2030-04-21',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Arrest date")').next().text().trim()).toStrictEqual('21 Apr 2030')
  })

  it('Should show in prison at recall if no return to custody date', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'DPS',
      returnToCustodyDate: undefined,
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Arrest date")').next().text().trim()).toStrictEqual('In prison at recall')
  })

  it('Should show TBC for adjustments if DPS recall', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'DPS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    const adjustmentsLink = $('h3:contains("UAL (unlawfully at large)")').next()
    // TODO should show UAL from backend instead of TBC
    expect(adjustmentsLink.text().trim()).toStrictEqual('TBC')
  })

  it('Should show link to adjustments if NOMIS recall', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    const adjustmentsLink = $('h3:contains("UAL (unlawfully at large)")').next().find('a')
    expect(adjustmentsLink.text().trim()).toStrictEqual('View UAL details')
    expect(adjustmentsLink.attr('href')).toStrictEqual('https://adjustments?prisonId=A1234BC')
  })
})
