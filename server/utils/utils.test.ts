import {
  addUnique,
  buildRecordARecallRequest,
  convertToTitleCase,
  initialiseName,
  removeItem,
  sortByDateDesc,
} from './utils'
import { RecallJourney } from '../@types/journeys'

describe('convert to title case', () => {
  it.each([
    [null, null, ''],
    ['empty string', '', ''],
    ['Lower case', 'robert', 'Robert'],
    ['Upper case', 'ROBERT', 'Robert'],
    ['Mixed case', 'RoBErT', 'Robert'],
    ['Multiple words', 'RobeRT SMiTH', 'Robert Smith'],
    ['Leading spaces', '  RobeRT', '  Robert'],
    ['Trailing spaces', 'RobeRT  ', 'Robert  '],
    ['Hyphenated', 'Robert-John SmiTH-jONes-WILSON', 'Robert-John Smith-Jones-Wilson'],
  ])('%s convertToTitleCase(%s, %s)', (_: string, a: string, expected: string) => {
    expect(convertToTitleCase(a)).toEqual(expected)
  })
})

describe('initialise name', () => {
  it.each([
    [null, null, null],
    ['Empty string', '', null],
    ['One word', 'robert', 'r. robert'],
    ['Two words', 'Robert James', 'R. James'],
    ['Three words', 'Robert James Smith', 'R. Smith'],
    ['Double barrelled', 'Robert-John Smith-Jones-Wilson', 'R. Smith-Jones-Wilson'],
  ])('%s initialiseName(%s, %s)', (_: string, a: string, expected: string) => {
    expect(initialiseName(a)).toEqual(expected)
  })
})

describe('addUnique', () => {
  it.each([
    { input: ['A', 'B'], id: 'C', expected: ['A', 'B', 'C'], desc: 'adds a new item' },
    { input: ['A', 'B'], id: 'A', expected: ['A', 'B'], desc: 'does not duplicate existing item' },
  ])('addUnique $desc', ({ input, id, expected }) => {
    expect(addUnique(input, id)).toEqual(expected)
  })
})

describe('removeItem', () => {
  it.each([
    { input: ['A', 'B', 'C'], id: 'B', expected: ['A', 'C'], desc: 'removes specified item' },
    { input: ['A', 'B'], id: 'Z', expected: ['A', 'B'], desc: 'returns unchanged list if item not found' },
  ])('removeItem $desc', ({ input, id, expected }) => {
    expect(removeItem(input, id)).toEqual(expected)
  })
})

describe('buildRecordARecallRequest', () => {
  it('includes returnToCustodyDate when not in custody at recall', () => {
    const journey = {
      revocationDate: { day: '1', month: '1', year: '2026' },
      returnToCustodyDate: { day: '3', month: '1', year: '2026' },
      inCustodyAtRecall: false,
    } as unknown as RecallJourney

    const result = buildRecordARecallRequest(journey, 'recall-id')

    expect(result).toEqual({
      revocationDate: '2026-01-01',
      returnToCustodyDate: '2026-01-03',
      recallId: 'recall-id',
    })
  })

  it('does not include returnToCustodyDate when already in custody at recall', () => {
    const journey = {
      revocationDate: { day: '1', month: '1', year: '2026' },
      returnToCustodyDate: { day: '3', month: '1', year: '2026' },
      inCustodyAtRecall: true,
    } as unknown as RecallJourney

    const result = buildRecordARecallRequest(journey, 'recall-id')

    expect(result).toEqual({
      revocationDate: '2026-01-01',
      recallId: 'recall-id',
    })
  })
})

describe('sortByDateDesc', () => {
  it('sorts items from newest to oldest based on a date string', () => {
    const courtCases = [
      { courtCaseUuid: '1', courtCaseDate: '2020-01-01' },
      { courtCaseUuid: '2', courtCaseDate: '2022-06-15' },
      { courtCaseUuid: '3', courtCaseDate: '2021-12-31' },
      { courtCaseUuid: '4', courtCaseDate: undefined },
    ]

    const sorted = sortByDateDesc(courtCases, c => c.courtCaseDate)

    expect(sorted.map(c => c.courtCaseUuid)).toEqual(['2', '3', '1', '4'])
  })

  it('handles undefined or missing dates', () => {
    const items = [
      { name: 'first', date: undefined },
      { name: 'second', date: '2022-01-01' },
      { name: 'third', date: '2021-01-01' },
    ]

    const sorted = sortByDateDesc(items, item => item.date)

    expect(sorted.map(i => i.name)).toEqual(['second', 'third', 'first'])
  })

  it('returns empty array when given empty input', () => {
    type TestItem = { date?: string }
    const sorted = sortByDateDesc<TestItem>([], item => item.date)
    expect(sorted).toEqual([])
  })

  it('does not mutate the original array', () => {
    const items = [
      { name: 'first', date: '2020-01-01' },
      { name: 'second', date: '2022-01-01' },
    ]
    const copy = [...items]
    sortByDateDesc(items, item => item.date)
    expect(items).toEqual(copy)
  })
})
