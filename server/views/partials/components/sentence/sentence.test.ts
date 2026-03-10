import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import {
  formatCountNumber,
  groupAndSortPeriodLengths,
  consecutiveToDetailsToDescription,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths, sentenceTypeValueOrLegacy } from '../../../../utils/utils'
import { RecallableCourtCaseSentence } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const njkEnv = nunjucks.configure([
  __dirname,
  'node_modules/govuk-frontend/dist/',
  'node_modules/govuk-frontend/dist/components/',
  'node_modules/@ministryofjustice/frontend/',
  'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
])

njkEnv.addFilter('formatDate', formatDate)
njkEnv.addFilter('periodLengthsToSentenceLengths', periodLengthsToSentenceLengths)
njkEnv.addFilter('groupAndSortPeriodLengths', groupAndSortPeriodLengths)
njkEnv.addFilter('formatCountNumber', formatCountNumber)
njkEnv.addFilter('sentenceTypeValueOrLegacy', sentenceTypeValueOrLegacy)
njkEnv.addFilter('consecutiveToDetailsToDescription', consecutiveToDetailsToDescription)

function valueInOffenceCard(key: string, $: cheerio.CheerioAPI) {
  const summaryList = $('[data-qa="offenceSummaryList"]')
  const rows = summaryList.find('.govuk-summary-list__row')
  return rows
    .filter((_, el) => $(el).find('.govuk-summary-list__key').text().trim() === key)
    .find('.govuk-summary-list__value')
    .text()
    .trim()
}

describe('Tests for sentence component', () => {
  it('renders an offence card with all expected fields', () => {
    const sentence = {
      offenceCode: '123AB',
      offenceDescription: 'Robbery',
      offenceStartDate: '2023-06-01',
      offenceEndDate: '2023-06-02',
      sentenceDate: '2023-07-01',
      countNumber: '1',
      sentenceLegacyData: null,
      terrorRelated: false,
      periodLengths: [],
      sentenceServeType: 'CONCURRENT',
      sentenceType: 'ORA SDS',
    } as unknown as RecallableCourtCaseSentence

    const html = njkEnv.render('test.njk', { sentence })
    const $ = cheerio.load(html)

    const summaryList = $('[data-qa="offenceSummaryList"]')
    expect(summaryList.length).toBe(1)
    const card = summaryList.closest('.offence-card')
    expect(card.length).toBe(1)
    const countText = card.find('span.govuk-body').text().trim()
    expect(countText).toBe('Count 1')
    const headingText = card.find('h4.govuk-heading-s').text().replace(/\s+/g, ' ').trim()
    expect(headingText).toBe('123AB Robbery')

    expect(valueInOffenceCard('Committed on', $)).toBe('01/06/2023 to 02/06/2023')
    expect(valueInOffenceCard('Sentence type', $)).toBe('ORA SDS')
    expect(valueInOffenceCard('Consecutive or concurrent', $)).toBe('Concurrent')
    expect(valueInOffenceCard('Sentencing warrant date', $)).toBe('01/07/2023')
  })

  it('renders an offence card with all expected fields when consecutive to is populated', () => {
    const sentence = {
      offenceCode: '123AB',
      offenceDescription: 'Robbery',
      offenceStartDate: '2023-06-01',
      offenceEndDate: '2023-06-02',
      sentenceDate: '2023-07-01',
      countNumber: '1',
      sentenceLegacyData: null,
      terrorRelated: false,
      periodLengths: [],
      sentenceServeType: 'CONSECUTIVE',
      consecutiveTo: {
        countNumber: '3',
        offenceCode: 'OFF1',
        offenceDescription: 'Offence Description',
      },
      sentenceType: 'ORA SDS',
    } as unknown as RecallableCourtCaseSentence

    const html = njkEnv.render('test.njk', { sentence })
    const $ = cheerio.load(html)

    const summaryList = $('[data-qa="offenceSummaryList"]')
    expect(summaryList.length).toBe(1)
    const card = summaryList.closest('.offence-card')
    expect(card.length).toBe(1)
    expect(valueInOffenceCard('Consecutive or concurrent', $)).toBe('Consecutive to count 3')
  })
})
