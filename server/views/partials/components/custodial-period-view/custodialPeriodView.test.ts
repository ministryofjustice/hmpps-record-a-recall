import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import {
  consecutiveToDetailsToDescription,
  formatCountNumber,
  formatLengths,
  groupAndSortPeriodLengths,
  sortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths } from '../../../../utils/utils'
import TestData from '../../../../testutils/testData'

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
njkEnv.addFilter('formatLengths', formatLengths)
njkEnv.addFilter('consecutiveToDetailsToDescription', consecutiveToDetailsToDescription)
njkEnv.addFilter('formatCountNumber', formatCountNumber)
njkEnv.addFilter('sortPeriodLengths', sortPeriodLengths)

describe('Filter and sort component', () => {
  const serviceDefinitions = TestData.serviceDefinitions()

  const render = (overrides = {}) =>
    cheerio.load(
      nunjucks.render('test.njk', {
        serviceDefinitions,
        sortBy: 'APPEARANCE_DATE_DESC',
        includeCasesFromPreviousPeriodsOfCustody: 'false',
        disableIncludeCasesFromPreviousPeriodsOfCustody: false,
        filterErrors: [],
        recalls: [TestData.existingRecall()],
        ...overrides,
      }),
    )

  it('should render filter and sort summary', () => {
    const $ = render()

    expect($('[data-qa="filterSortSummary"]').text().trim()).toBe('Filter and sort')
  })

  it.each([
    ['APPEARANCE_DATE_DESC', 'Court appearance (most recent)'],
    ['APPEARANCE_DATE_ASC', 'Court appearance (earliest)'],
  ])('should check correct sort radio option for %s', (sortBy, expectedLabel) => {
    const $ = render({ sortBy })

    const selected = $(`input[name="sortBy"][value="${sortBy}"]`)

    expect(selected.length).toBe(1)

    // GOV.UK macros set checked as attribute when selected
    expect(selected.attr('checked')).toBeDefined()

    // label is not inside parent in GOV.UK markup; use for/id relationship instead
    const id = selected.attr('id')
    const labelText = id ? $(`label[for="${id}"]`).text().trim() : ''

    expect(labelText).toBe(expectedLabel)
  })

  it('should check include previous custody checkbox when selected', () => {
    const $ = render({
      includeCasesFromPreviousPeriodsOfCustody: 'true',
    })

    const checkbox = $('input[name="includeCasesFromPreviousPeriodsOfCustody"]')

    expect(checkbox.length).toBe(1)
    expect(checkbox.attr('checked')).toBeDefined()
  })

  it('should disable include previous custody checkbox when disabled', () => {
    const $ = render({
      disableIncludeCasesFromPreviousPeriodsOfCustody: true,
    })

    const checkbox = $('input[name="includeCasesFromPreviousPeriodsOfCustody"]')

    expect(checkbox.length).toBe(1)
    expect(checkbox.attr('disabled')).toBeDefined()
  })

  it('should render apply button', () => {
    const $ = render()

    const button = $('[data-qa="applyButton"]')

    expect(button.length).toBe(1)
    expect(button.text().trim()).toBe('Apply')
  })

  it('should open filter details when filter errors exist', () => {
    const $ = render({
      filterErrors: ['error'],
    })

    const details = $('details.govuk-details')

    expect(details.length).toBe(1)
    expect(details.attr('open')).toBeDefined()
  })

  it('should not open filter details when there are no filter errors', () => {
    const $ = render({
      filterErrors: [],
    })

    const details = $('details.govuk-details')

    expect(details.attr('open')).toBeUndefined()
  })
})
