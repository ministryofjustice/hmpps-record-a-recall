import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import RecallCardModel from './RecallCardModel'
import { formatDate } from '../../../../utils/utils'

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
}

describe('Tests for recall card component', () => {
  it.each([
    [{ ...aRecall, createdAtLocationName: undefined }, 'Recorded on 03 Feb 2021'],
    [{ ...aRecall, createdAtLocationName: 'HMP Brixton' }, 'Recorded on 03 Feb 2021 at HMP Brixton'],
  ])('Should show heading with location if present (%j, %s)', (model: RecallCardModel, expectedTitle) => {
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-card-title]').text().trim()).toStrictEqual(expectedTitle)
  })

  it('Should show NOMIS badge with no actions if source is NOMIS', () => {
    const model: RecallCardModel = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model })
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
      const content = nunjucks.render('test.njk', { model })
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
})
