import { convertToTitleCase, initialiseName, lowercaseFirstLetter } from './utils'

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

describe('lowercaseFirstLetter', () => {
  it.each([
    [null, null, ''],
    ['Empty string', '', ''],
    ['Single letter', 'A', 'a'],
    ['Already lowercase', 'this is all lowercase', 'this is all lowercase'],
    ['Uppercase', 'THIS IS ALL UPPERCASE', 'tHIS IS ALL UPPERCASE'],
    ['Sentence case', 'This is sentence case', 'this is sentence case'],
  ])('%s lowercaseFirstLetter(%s) = %s', (_: string, s: string, expected: string) => {
    expect(lowercaseFirstLetter(s)).toEqual(expected)
  })
})
