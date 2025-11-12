import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import {
  formatCountNumber,
  groupAndSortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths, sentenceTypeValueOrLegacy } from '../../../../utils/utils'
import { RecallableCourtCaseSentence } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const njkEnv = nunjucks.configure([
  __dirname,
  'node_modules/govuk-frontend/dist/',
  'node_modules/govuk-frontend/dist/components/',
  'node_modules/@ministryofjustice/frontend/',
  'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
  'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/components/',
])

njkEnv.addFilter('formatDate', formatDate)
njkEnv.addFilter('periodLengthsToSentenceLengths', periodLengthsToSentenceLengths)
njkEnv.addFilter('groupAndSortPeriodLengths', groupAndSortPeriodLengths)
njkEnv.addFilter('formatCountNumber', formatCountNumber)
njkEnv.addFilter('sentenceTypeValueOrLegacy', sentenceTypeValueOrLegacy)

describe('Tests for sentence component', () => {
  it('renders an offence card when sentence is provided', () => {
    const sentence = {
      sentenceType: 'Required',
      offenceCode: '123AB',
      offenceDescription: 'Robbery',
      offenceStartDate: '2023-06-01',
      sentenceDate: '2023-07-01',
      countNumber: '1',
      periodLengths: [],
    } as unknown as RecallableCourtCaseSentence

    const html = nunjucks.render('test.njk', {
      sentence,
    })
    const $ = cheerio.load(html)

    expect($.text()).toContain('Robbery')

    const offenceCardCount = $('[class*="offence-card"], [data-qa*="offence"]').length
    expect(offenceCardCount).toBeGreaterThan(0)
  })
})
