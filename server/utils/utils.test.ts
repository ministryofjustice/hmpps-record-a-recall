import { addUnique, convertToTitleCase, initialiseName, removeItem } from './utils'

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
