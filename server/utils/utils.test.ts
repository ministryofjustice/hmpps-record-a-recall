import { addUnique, buildRecordARecallRequest, convertToTitleCase, initialiseName, removeItem } from './utils'
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
