import path from 'path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'

import {
  formatCountNumber,
  groupAndSortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { formatDate, periodLengthsToSentenceLengths, sentenceTypeValueOrLegacy } from '../../../../utils/utils'
import TestData from '../../../../testutils/testData'
import { RecallableCourtCaseSentence } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

const njkEnv = nunjucks.configure(
  [
    path.join(process.cwd(), 'server/views'),
    'node_modules/govuk-frontend/dist/',
    'node_modules/govuk-frontend/dist/components/',
    'node_modules/@ministryofjustice/frontend/',
    'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
    'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/components/',
  ],
  { autoescape: true },
)

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

const serviceDefinitions = TestData.serviceDefinitions()

// Absolute path to the template
const templatePath = path.resolve(process.cwd(), 'server/views/partials/components/case-and-sentences/test.njk')

describe('Tests for case-and-sentences component', () => {
  it.each([
    [{ ...baseCase }, 'CASE123 at Bradford Crown Court on 01 Jan 2024'],
    [{ ...baseCase, reference: undefined }, 'Bradford Crown Court on 01 Jan 2024'],
  ])('renders the heading correctly (%j)', (courtCase, expectedText) => {
    const html = njkEnv.render(templatePath, {
      courtCase,
      sentences: courtCase.sentences,
      serviceDefinitions,
    })
    const $ = cheerio.load(html)

    const headingText = $('[data-qa="court-case-main-heading"]').text().replace(/\s+/g, ' ').trim()
    expect(headingText).toBe(expectedText)
  })

  it('renders an offence card when sentences are provided', () => {
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

    const html = njkEnv.render(templatePath, {
      courtCase: caseWithSentence,
      sentences: caseWithSentence.sentences,
      serviceDefinitions,
    })
    const $ = cheerio.load(html)

    expect($.text()).toContain('Robbery')

    const offenceCardCount = $('[class*="offence-card"], [data-qa*="offence"]').length
    expect(offenceCardCount).toBeGreaterThan(0)
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

    const html = njkEnv.render(templatePath, {
      courtCase,
      sentences: courtCase.sentences,
      serviceDefinitions,
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

  it('renders the sentenceType correctly for each sentence', () => {
    const sentenceWithType = {
      sentenceType: 'Imprisonment in Default of Fine',
      offenceCode: 'TP47017',
      offenceDescription: 'Accidentally allow a chimney to be on fire',
      offenceStartDate: '2025-02-02',
      sentenceDate: '2025-03-03',
      countNumber: '1',
      periodLengths: [],
    } as unknown as RecallableCourtCaseSentence

    const sentenceWithRequiredTypeDesc = {
      sentenceType: '',
      offenceCode: 'X999',
      offenceDescription: 'Theft from shop',
      offenceStartDate: '2025-02-01',
      sentenceDate: '2025-03-01',
      countNumber: '2',
      periodLengths: [],
    } as unknown as RecallableCourtCaseSentence

    const courtCase = {
      ...baseCase,
      recallableSentences: [sentenceWithType, sentenceWithRequiredTypeDesc],
    }

    const html = njkEnv.render(templatePath, {
      courtCase,
      sentences: courtCase.sentences,
      serviceDefinitions,
    })

    const $ = cheerio.load(html)

    // Should contain the first sentenceType text
    expect($.html()).toContain('Imprisonment in Default of Fine')

    // Should have an empty sentenceType for the second sentence
    expect(sentenceWithRequiredTypeDesc.sentenceType).toBe('')
  })
})
