import { addDays, differenceInCalendarDays, parse, isEqual, subDays, formatISO } from 'date-fns'
import dayjs from 'dayjs'
import { SentenceLength } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import { PeriodLength } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { DateParts } from '../@types/journeys'

const properCase = (word: string): string =>
  word.length >= 1 ? word[0].toUpperCase() + word.toLowerCase().slice(1) : word

const isBlank = (str: string): boolean => !str || /^\s*$/.test(str)

/**
 * Converts a name (first name, last name, middle name, etc.) to proper case equivalent, handling double-barreled names
 * correctly (i.e. each part in a double-barreled is converted to proper case).
 * @param name name to be converted.
 * @returns name converted to proper case.
 */
const properCaseName = (name: string): string => (isBlank(name) ? '' : name.split('-').map(properCase).join('-'))

export const convertToTitleCase = (sentence: string): string =>
  isBlank(sentence) ? '' : sentence.split(' ').map(properCaseName).join(' ')

export const initialiseName = (fullName?: string): string | null => {
  // this check is for the authError page
  if (!fullName) return null

  const array = fullName.split(' ')
  return `${array[0][0]}. ${array.reverse()[0]}`
}

export const datePartsToDate = (dateParts: DateParts): Date => {
  return parse(`${dateParts.year}-${dateParts.month}-${dateParts.day}`, 'yyyy-MM-dd', new Date())
}

export const dateToIsoString = (date: Date): string => {
  return formatISO(date).split('T')[0]
}

export const formatDate = (date?: string, format = 'DD MMM YYYY') => {
  if (!date) return null
  return dayjs(date).format(format)
}

const periodLengthTypeHeadings = {
  SENTENCE_LENGTH: 'Sentence length',
  CUSTODIAL_TERM: 'Custodial term',
  LICENCE_PERIOD: 'Licence period',
  TARIFF_LENGTH: 'Tariff length',
  TERM_LENGTH: 'Term length',
  OVERALL_SENTENCE_LENGTH: 'Overall sentence length',
  UNSUPPORTED: 'Unknown',
}

export const periodLengthsToSentenceLengths = (periodLengths: PeriodLength[]): SentenceLength[] => {
  if (periodLengths) {
    return periodLengths.map(periodLength => periodLengthToSentenceLength(periodLength))
  }
  return null
}

export const periodLengthToSentenceLength = (periodLength: PeriodLength): SentenceLength => {
  if (periodLength) {
    return {
      ...(typeof periodLength.days === 'number' ? { days: String(periodLength.days) } : {}),
      ...(typeof periodLength.weeks === 'number' ? { weeks: String(periodLength.weeks) } : {}),
      ...(typeof periodLength.months === 'number' ? { months: String(periodLength.months) } : {}),
      ...(typeof periodLength.years === 'number' ? { years: String(periodLength.years) } : {}),
      periodOrder: periodLength.periodOrder.split(','),
      periodLengthType: periodLength.periodLengthType,
      legacyData: periodLength.legacyData,
      description:
        periodLengthTypeHeadings[periodLength.periodLengthType] ?? periodLength.legacyData?.sentenceTermDescription,
      uuid: periodLength.periodLengthUuid,
    } as SentenceLength
  }
  return null
}

export function calculateUal(revDate: string | Date, returnToCustodyDate?: string | Date): number {
  const ualStart = addDays(revDate, 1)
  if (!returnToCustodyDate || isEqual(revDate, returnToCustodyDate) || isEqual(ualStart, returnToCustodyDate)) {
    return null
  }
  const ualEnd = subDays(returnToCustodyDate, 1)
  return differenceInCalendarDays(ualEnd, ualStart) + 1
}

export const maxOf = <A, B>(all: A[], map: (a: A) => B): B => {
  let max: B = null
  all.forEach(it => {
    if (!max) {
      max = map(it)
    }
    if (map(it) > max) {
      max = map(it)
    }
  })
  return max
}

export const lowercaseFirstLetter = (s: string): string => {
  return s ? s[0].toLowerCase() + s.slice(1) : ''
}

export const addUnique = (list: string[], addValue: string) => (list.includes(addValue) ? list : [...list, addValue])
export const removeItem = (list: string[], removeValue: string) => list.filter(it => it !== removeValue)

export const sentenceTypeValueOrLegacy = (sentenceTypeValue: string, legacyData: Record<string, never>) => {
  if (sentenceTypeValue) {
    return sentenceTypeValue
  }
  if (legacyData?.sentenceTypeDesc) {
    return legacyData.sentenceTypeDesc
  }
  return null
}
