import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

import {
  formatCountNumber,
  groupAndSortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths, sentenceTypeValueOrLegacy } from '../../../../utils/utils'
import { RecallableCourtCaseSentence } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const njkEnv = nunjucks.configure([
  path.join(__dirname, '../../../'),
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

const baseCase = {
  id: uuidv4(),
  reference: 'CASE123',
  courtName: 'Bradford Crown Court',
  appearanceDate: '2024-01-01',
  sentences: [] as unknown[],
}

describe('Tests for case-and-sentences component', () => {
  it.each([
    [{ ...baseCase }, 'CASE123 at Bradford Crown Court on 01/01/2024'],
    [{ ...baseCase, reference: undefined }, 'Bradford Crown Court on 01/01/2024'],
  ])('renders the heading correctly (%j)', (courtCase, expectedText) => {
    const html = nunjucks.render('partials/components/case-and-sentences/test.njk', {
      courtCase,
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

    const ineligible = [
      {
        sentenceType: 'Required',
        offenceCode: '123AB',
        offenceDescription: 'Murder',
        offenceStartDate: '2023-06-01',
        sentenceDate: '2023-07-01',
        countNumber: '1',
        periodLengths: [],
      } as unknown as RecallableCourtCaseSentence,
    ]

    const expired = [
      {
        sentenceType: 'Required',
        offenceCode: '123AB',
        offenceDescription: 'Violence',
        offenceStartDate: '2023-06-01',
        sentenceDate: '2023-07-01',
        countNumber: '1',
        periodLengths: [],
      } as unknown as RecallableCourtCaseSentence,
    ]
    const html = nunjucks.render('partials/components/case-and-sentences/test.njk', {
      courtCase: caseWithSentence,
      ineligible,
      expired,
    })
    const $ = cheerio.load(html)

    expect($.text()).toContain('Robbery')

    expect($.text()).toContain('View sentences with an expired SLED (1)')
    expect($.text()).toContain('Violence')

    expect($.text()).toContain('View sentences that are ineligible for recall (1)')
    expect($.text()).toContain('Murder')

    const offenceCardCount = $('[class*="offence-card"], [data-qa*="offence"]').length
    expect(offenceCardCount).toBe(9)
  })

  it('renders count number and line number correctly for sentences', () => {
    const sentenceWithCount = {
      sentenceTypeDescription: 'Standard',
      offenceCode: 'X123',
      offenceDescription: 'Assault',
      offenceStartDate: '2024-02-01',
      sentenceDate: '2024-03-01',
      countNumber: '2',
      periodLengths: [],
    } as unknown as RecallableCourtCaseSentence

    const sentenceWithLineNumber = {
      sentenceTypeDescription: 'Standard',
      offenceCode: 'Y456',
      offenceDescription: 'Theft',
      offenceStartDate: '2024-04-01',
      sentenceDate: '2024-05-01',
      lineNumber: 'L-10',
      sentenceLegacyData: true,
      periodLengths: [],
    } as unknown as RecallableCourtCaseSentence

    const courtCase = {
      ...baseCase,
      recallableSentences: [sentenceWithCount, sentenceWithLineNumber],
    }

    const html = nunjucks.render('partials/components/case-and-sentences/test.njk', {
      courtCase,
    })

    const $ = cheerio.load(html)

    // Expect offences to appear
    expect($.text()).toContain('Assault')
    expect($.text()).toContain('Theft')

    // Check count number for first offence
    const firstOffence = $('[class*="offence-card"]').first().text()
    expect(firstOffence).toContain('Count 2')

    // Check line number for second offence
    const secondOffence = $('[class*="offence-card"]').last().text()
    expect(secondOffence).toContain('L-10')
  })

  // TODO add more tests for the sentence section (test all permutations of offence cards) - sentence card population is currently under rework
})
