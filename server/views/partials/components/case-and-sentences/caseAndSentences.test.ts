import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'

import {
  formatCountNumber,
  groupAndSortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths } from '../../../../utils/utils'
import TestData from '../../../../testutils/testData'
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

const baseCase = {
  id: uuidv4(),
  reference: 'CASE123',
  courtName: 'Bradford Crown Court',
  formattedOverallConvictionDate: '01 Jan 2024',
  sentences: [] as unknown[],
}

const serviceDefinitions = TestData.serviceDefinitions()

describe('Tests for case-and-sentences component', () => {
  it.each([
    [{ ...baseCase }, 'CASE123 at Bradford Crown Court on 01 Jan 2024'],
    [{ ...baseCase, reference: undefined }, 'Bradford Crown Court on 01 Jan 2024'],
  ])('renders the heading correctly (%j)', (courtCase, expectedText) => {
    const html = nunjucks.render('test.njk', {
      courtCase,
      serviceDefinitions,
    })
    const $ = cheerio.load(html)

    const headingText = $('[data-qa="court-case-main-heading"]').text().replace(/\s+/g, ' ').trim()
    expect(headingText).toBe(expectedText)
  })

  it('renders an offence card when recallableSentences are provided', () => {
    const caseWithSentence = {
      ...baseCase,
      recallableSentences: [
        {
          sentenceType: 'Required',
          offenceCode: '123AB',
          offenceDescription: 'Robbery',
          offenceStartDate: '2023-06-01',
          sentenceDate: '2023-07-01',
          countNumber: '1',
          periodLengths: [],
        } as unknown as RecallableCourtCaseSentence,
      ],
    }

    const html = nunjucks.render('test.njk', {
      courtCase: caseWithSentence,
      serviceDefinitions,
    })
    const $ = cheerio.load(html)

    expect($.text()).toContain('Robbery')

    const offenceCardCount = $('[class*="offence-card"], [data-qa*="offence"]').length
    expect(offenceCardCount).toBeGreaterThan(0)
  })

  // TODO add more tests for the sentence section (test all permutations of offence cards) - sentence card population is currently under rework
})
