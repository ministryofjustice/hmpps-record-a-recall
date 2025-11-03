import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import {
  consecutiveToDetailsToDescription,
  formatCountNumber,
  formatLengths,
  groupAndSortPeriodLengths,
  sortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { ExistingRecall, ExistingRecallSentence } from '../../../../model/ExistingRecall'
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

const aRecall: ExistingRecall = {
  recallUuid: 'abc123',
  prisonerId: 'A1234BC',
  source: 'DPS',
  createdAtTimestamp: '2021-02-03T13:21:00Z',
  createdAtLocationName: 'HMP Brixton',
  canEdit: false,
  canDelete: false,
  recallTypeDescription: 'Standard Recall',
  revocationDate: '2021-02-01',
  courtCases: [],
}

const serviceDefinitions = TestData.serviceDefinitions()

describe('Tests for recall card component', () => {
  it.each([
    [{ ...aRecall, createdAtLocationName: undefined }, 'Recorded on 03 Feb 2021'],
    [{ ...aRecall, createdAtLocationName: 'HMP Brixton' }, 'Recorded on 03 Feb 2021 at HMP Brixton'],
  ])('Should show heading with location if present (%j, %s)', (model: ExistingRecall, expectedTitle) => {
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-card-title]').text().trim()).toStrictEqual(expectedTitle)
  })

  it('Should show NOMIS badge with no actions if source is NOMIS', () => {
    const model: ExistingRecall = {
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
      '/person/A1234BC/recall/abc123/delete',
      'Delete recall recorded on 03 Feb 2021',
    ],
    [
      { ...aRecall, source: 'DPS', canEdit: false, canDelete: true },
      undefined,
      undefined,
      '/person/A1234BC/recall/abc123/delete',
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
    (model: ExistingRecall, expectedEditLink, expectedEditText, expectedDeleteLink, expectedDeleteText) => {
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
    const model: ExistingRecall = {
      ...aRecall,
      source: 'DPS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Recall type")').next().text().trim()).toStrictEqual('Standard Recall')
  })

  it('Should show not entered for revocation date if source is NOMIS', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Revocation date")').next().text().trim()).toStrictEqual('Not entered')
  })

  it('Should show the revocation date if source is DPS', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'DPS',
      revocationDate: '2031-03-10',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Revocation date")').next().text().trim()).toStrictEqual('10 Mar 2031')
  })

  it('Should show the return to custody date if present', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'DPS',
      returnToCustodyDate: '2030-04-21',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Arrest date")').next().text().trim()).toStrictEqual('21 Apr 2030')
  })

  it('Should show in prison at recall if no return to custody date', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'DPS',
      returnToCustodyDate: undefined,
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('h3:contains("Arrest date")').next().text().trim()).toStrictEqual('In prison at recall')
  })

  it.each([
    [1, '1 day'],
    [2, '2 days'],
  ])(
    'Should show adjustment amount for adjustments if DPS recall',
    (ualAdjustmentTotalDays: number, expected: string) => {
      const model: ExistingRecall = {
        ...aRecall,
        source: 'DPS',
        ualAdjustmentTotalDays,
      }
      const content = nunjucks.render('test.njk', { model, serviceDefinitions })
      const $ = cheerio.load(content)
      const adjustmentsLink = $('h3:contains("UAL (unlawfully at large)")').next()
      expect(adjustmentsLink.text().trim()).toStrictEqual(expected)
    },
  )

  it('Should show none for adjustments if DPS recall but there are no adjustments', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'DPS',
      ualAdjustmentTotalDays: undefined,
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    const adjustmentsLink = $('h3:contains("UAL (unlawfully at large)")').next()
    expect(adjustmentsLink.text().trim()).toStrictEqual('None')
  })

  it('Should show link to adjustments if NOMIS recall', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'NOMIS',
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    const adjustmentsLink = $('h3:contains("UAL (unlawfully at large)")').next().find('a')
    expect(adjustmentsLink.text().trim()).toStrictEqual('View UAL details')
    expect(adjustmentsLink.attr('href')).toStrictEqual('https://adjustments?prisonId=A1234BC')
  })

  it('Should show count of court cases with sub heading for each court case showing all available reference points in the heading', () => {
    const model: ExistingRecall = {
      ...aRecall,
      source: 'NOMIS',
      courtCases: [
        {
          courtCaseReference: 'CC1',
          courtName: 'Exeter Crown Court',
          courtCaseDate: '2025-06-15',
        },
        {
          courtCaseReference: 'CC2',
          courtName: undefined,
          courtCaseDate: '2025-06-15',
        },
        {
          courtCaseReference: 'CC3',
          courtName: 'Exeter Crown Court',
          courtCaseDate: undefined,
        },
        {
          courtCaseReference: undefined,
          courtName: 'Exeter Crown Court',
          courtCaseDate: '2025-06-15',
        },
        {
          courtCaseReference: undefined,
          courtName: undefined,
          courtCaseDate: '2025-06-15',
        },
        {
          courtCaseReference: undefined,
          courtName: 'Exeter Crown Court',
          courtCaseDate: undefined,
        },
        {
          courtCaseReference: undefined,
          courtName: undefined,
          courtCaseDate: '2025-06-15',
        },
        {
          courtCaseReference: undefined,
          courtName: undefined,
          courtCaseDate: undefined,
        },
      ],
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-court-case-details]').text().trim()).toStrictEqual('Court cases (8)')
    expect($('[data-qa=recall-abc123-court-case-heading-1]').text().trim()).toStrictEqual(
      'CC1 at Exeter Crown Court on 15/06/2025',
    )
    expect($('[data-qa=recall-abc123-court-case-heading-2]').text().trim()).toStrictEqual('CC2 on 15/06/2025')
    expect($('[data-qa=recall-abc123-court-case-heading-3]').text().trim()).toStrictEqual('CC3 at Exeter Crown Court')
    expect($('[data-qa=recall-abc123-court-case-heading-4]').text().trim()).toStrictEqual(
      'Case held at Exeter Crown Court on 15/06/2025',
    )
    expect($('[data-qa=recall-abc123-court-case-heading-5]').text().trim()).toStrictEqual('Case on 15/06/2025')
    expect($('[data-qa=recall-abc123-court-case-heading-6]').text().trim()).toStrictEqual(
      'Case held at Exeter Crown Court',
    )
    expect($('[data-qa=recall-abc123-court-case-heading-7]').text().trim()).toStrictEqual('Case on 15/06/2025')
    expect($('[data-qa=recall-abc123-court-case-heading-8]').text().trim()).toStrictEqual('')
  })

  it('Should show offence cards for all sentences under a court case', () => {
    const sentenceWithMaximum: ExistingRecallSentence = {
      sentenceUuid: uuidv4(),
      offenceCode: 'A1',
      offenceDescription: 'Assault',
      offenceStartDate: '2019-02-25',
      offenceEndDate: '2020-03-30',
      sentenceDate: '2021-04-12',
      lineNumber: null,
      countNumber: '1',
      periodLengths: [
        {
          years: 1,
          months: 2,
          weeks: 3,
          days: 4,
          periodOrder: 'years',
          periodLengthType: 'SENTENCE_LENGTH',
          legacyData: {
            lifeSentence: false,
            sentenceTermCode: 'foo',
            sentenceTermDescription: 'bar',
          },
          periodLengthUuid: uuidv4(),
        },
      ],
      sentenceServeType: 'CONCURRENT',
      sentenceTypeDescription: 'Serious Offence Sec 250 Sentencing Code (U18)',
    }
    const sentenceWithMinimum: ExistingRecallSentence = {
      sentenceUuid: uuidv4(),
      offenceCode: 'B2',
      offenceDescription: 'Burglary',
      offenceStartDate: undefined,
      offenceEndDate: undefined,
      sentenceDate: undefined,
      lineNumber: '2',
      countNumber: undefined,
      periodLengths: [
        {
          years: undefined,
          months: undefined,
          weeks: undefined,
          days: undefined,
          periodOrder: 'years',
          periodLengthType: 'SENTENCE_LENGTH',
          legacyData: undefined,
          periodLengthUuid: uuidv4(),
        },
      ],
      sentenceServeType: 'CONSECUTIVE',
      sentenceTypeDescription: undefined,
    }
    const model: ExistingRecall = {
      ...aRecall,
      source: 'NOMIS',
      courtCases: [
        {
          courtCaseReference: 'CC1',
          courtName: 'Exeter Crown Court',
          courtCaseDate: '2025-06-15',
          sentences: [sentenceWithMaximum, sentenceWithMinimum],
        },
      ],
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    expect($('[data-qa=recall-abc123-court-case-details]').text().trim()).toStrictEqual('Court cases (1)')
    const maximumOffenceCard = $(`[data-qa=recall-abc123-court-case-1-sentences-1]`).find(
      '.offence-card-offence-details',
    )
    expect(maximumOffenceCard).toHaveLength(1)
    expect(maximumOffenceCard.children().eq(0).text()).toStrictEqual('Count 1')
    expect(maximumOffenceCard.children('h4').text().trim()).toStrictEqual('A1 Assault')
    expect(maximumOffenceCard.find('dt:contains("Committed on")').next().text().trim()).toStrictEqual(
      '25/02/2019 to 30/03/2020',
    )
    expect(maximumOffenceCard.find('dt:contains("Sentence type")').next().text().trim()).toStrictEqual(
      'Serious Offence Sec 250 Sentencing Code (U18)',
    )
    expect(maximumOffenceCard.find('dt:contains("Sentence date")').next().text().trim()).toStrictEqual('12/04/2021')
    expect(maximumOffenceCard.find('dt:contains("Sentence length")').next().text().trim()).toStrictEqual(
      '1 years  0 months 0 weeks 0 days',
    )
    expect(maximumOffenceCard.find('dt:contains("Consecutive or concurrent")').next().text().trim()).toStrictEqual(
      'Concurrent',
    )

    const minimumOffenceCard = $(`[data-qa=recall-abc123-court-case-1-sentences-2]`).find(
      '.offence-card-offence-details',
    )
    expect(minimumOffenceCard).toHaveLength(1)
    expect(minimumOffenceCard.children().eq(0).text()).toStrictEqual('NOMIS line number 2')
    expect(minimumOffenceCard.children('h4').text().trim()).toStrictEqual('B2 Burglary')
    expect(minimumOffenceCard.find('dt:contains("Committed on")').next().text().trim()).toStrictEqual('Not entered')
    expect(minimumOffenceCard.find('dt:contains("Sentence type")').next().text().trim()).toStrictEqual('Not entered')
    expect(minimumOffenceCard.find('dt:contains("Sentence date")').next().text().trim()).toStrictEqual('Not entered')
    expect(minimumOffenceCard.find('dt:contains("Sentence length")').next().text().trim()).toStrictEqual(
      '0 years  0 months 0 weeks 0 days',
    )
    expect(minimumOffenceCard.find('dt:contains("Consecutive or concurrent")').next().text().trim()).toStrictEqual(
      'Consecutive',
    )
  })

  it('Should hide line and count number if count number is -1 in RaS', () => {
    const sentenceWithMinusOneCountNumber: ExistingRecallSentence = {
      sentenceUuid: uuidv4(),
      offenceCode: 'A1',
      offenceDescription: 'Assault',
      offenceStartDate: '2019-02-25',
      offenceEndDate: '2020-03-30',
      sentenceDate: '2021-04-12',
      lineNumber: null,
      countNumber: '-1',
      periodLengths: [
        {
          years: 1,
          months: 2,
          weeks: 3,
          days: 4,
          periodOrder: 'years',
          periodLengthType: 'SENTENCE_LENGTH',
          legacyData: {
            lifeSentence: false,
            sentenceTermCode: 'foo',
            sentenceTermDescription: 'bar',
          },
          periodLengthUuid: uuidv4(),
        },
      ],
      sentenceServeType: 'CONCURRENT',
      sentenceTypeDescription: 'Serious Offence Sec 250 Sentencing Code (U18)',
    }
    const model: ExistingRecall = {
      ...aRecall,
      source: 'NOMIS',
      courtCases: [
        {
          courtCaseReference: 'CC1',
          courtName: 'Exeter Crown Court',
          courtCaseDate: '2025-06-15',
          sentences: [sentenceWithMinusOneCountNumber],
        },
      ],
    }
    const content = nunjucks.render('test.njk', { model, serviceDefinitions })
    const $ = cheerio.load(content)
    const card = $(`[data-qa=recall-abc123-court-case-1-sentences-1]`).find('.offence-card-offence-details')
    expect(card).toHaveLength(1)
    // first child is the offence code instead of nomis line number or count
    expect(card.children().eq(0).text().trim()).toStrictEqual('A1 Assault')
  })
})
