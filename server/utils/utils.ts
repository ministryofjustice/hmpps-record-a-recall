import { addDays, differenceInCalendarDays, format, isEqual, subDays, parseISO } from 'date-fns'
import { compact } from 'lodash'
// eslint-disable-next-line import/no-unresolved
import { UAL } from 'models'
import { SummaryListRow } from '../@types/govuk'
import toSummaryListRow from '../helpers/componentHelper'
import { formatLongDate } from '../formatters/formatDate'
import { RecallJourneyData } from '../helpers/formWizardHelper'
import logger from '../../logger'
import config from '../config'

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

export const formatDate = (date: Date): string => {
  return date ? format(date, 'yyyy-MM-dd') : null
}

export function parseBooleanString(booleanString?: string): boolean | undefined {
  if (booleanString === 'true') {
    return true
  }
  if (booleanString === 'false') {
    return false
  }
  return undefined
}
export const sanitizeString = (string: string | null): string | null => {
  return string ? string.trim().toUpperCase() : null
}

export function calculateUal(revDate: string | Date, returnToCustodyDate?: string | Date): UAL {
  const ualStart = addDays(revDate, 1)
  if (!returnToCustodyDate || isEqual(revDate, returnToCustodyDate) || isEqual(ualStart, returnToCustodyDate)) {
    return null
  }
  const ualEnd = subDays(returnToCustodyDate, 1)
  return {
    firstDay: ualStart,
    lastDay: ualEnd,
    days: differenceInCalendarDays(ualEnd, ualStart) + 1,
  }
}

export function formatDateStringToDDMMYYYY(isoDateString?: string): string {
  if (!isoDateString) {
    return 'Not available'
  }
  try {
    const dateObj = parseISO(isoDateString)
    return format(dateObj, 'dd/MM/yyyy')
  } catch (e) {
    logger.error('Error formatting date string:', isoDateString, e)
    return 'Invalid date'
  }
}

export function createAnswerSummaryList(
  journeyData: RecallJourneyData,
  editLink: (page: string) => string,
): SummaryListRow[] {
  const sentences = journeyData.eligibleSentenceCount === 1 ? 'sentence' : 'sentences'
  const cases = journeyData.courtCaseCount === 1 ? 'case' : 'cases'
  return compact([
    toSummaryListRow('Date of revocation', formatLongDate(journeyData.revocationDate), editLink('revocation-date')),
    toSummaryListRow(
      'Arrest date',
      formatLongDate(journeyData.returnToCustodyDate) || 'In prison when recalled',
      editLink('rtc-date'),
    ),
    journeyData.courtCaseCount
      ? toSummaryListRow(
          'Court cases',
          `${journeyData.courtCaseCount} ${cases}`,
          journeyData.storedRecall?.recallType?.fixedTerm ? undefined : editLink('select-cases'),
        )
      : null,
    toSummaryListRow(
      'Sentences',
      `${journeyData.eligibleSentenceCount} ${sentences}`,
      editLink('check-sentences'),
      'Review',
    ),
    toSummaryListRow('Recall type', journeyData.recallType.description, editLink('recall-type')),
  ])
}

export const periodLengthsToSentenceLengths = (periodLengths: PeriodLength[]): SentenceLength[] => {
  if (!periodLengths) return null

  const mapped = periodLengths.map(periodLength => periodLengthToSentenceLength(periodLength))

  // enforce order: Sentence Length first, then Licence Period, then everything else
  const order = {
    SENTENCE_LENGTH: 1,
    LICENCE_PERIOD: 2,
    CUSTODIAL_TERM: 3,
    TARIFF_LENGTH: 4,
    TERM_LENGTH: 5,
    OVERALL_SENTENCE_LENGTH: 6,
    UNSUPPORTED: 99,
  }

  return mapped.sort((a, b) => {
    const aRank = order[a.periodLengthType] || 50
    const bRank = order[b.periodLengthType] || 50
    return aRank - bRank
  })
}

export const lowercaseFirstLetter = (s: string): string => {
  return s ? s[0].toLowerCase() + s.slice(1) : ''
}

export const entrypointUrl = (entrypoint: string, nomisId: string): string => {
  if (entrypoint === 'ccards') {
    return `${config.applications.courtCasesReleaseDates.url}/prisoner/${nomisId}/overview`
  }
  if (entrypoint?.startsWith('adj_')) {
    const adjustmentTypeUrl = entrypoint.substring(entrypoint.indexOf('_') + 1)
    return `${config.applications.adjustments.url}/${nomisId}/${adjustmentTypeUrl}/view`
  }
  return `/person/${nomisId}`
}

export interface SentenceLength {
  years?: string
  months?: string
  weeks?: string
  days?: string
  periodOrder: string[]
  periodLengthType:
    | 'SENTENCE_LENGTH'
    | 'CUSTODIAL_TERM'
    | 'LICENCE_PERIOD'
    | 'TARIFF_LENGTH'
    | 'TERM_LENGTH'
    | 'OVERALL_SENTENCE_LENGTH'
  description?: string
  uuid?: string
}

// Helper function to get display string for sentence period types
const getDisplayDescription = (type: PeriodLength['periodLengthType']): string => {
  switch (type) {
    case 'SENTENCE_LENGTH':
      return 'Sentence Length'
    case 'CUSTODIAL_TERM':
      return 'Custodial Term'
    case 'TARIFF_LENGTH':
      return 'Tariff Length'
    case 'TERM_LENGTH':
      return 'Term Length'
    case 'OVERALL_SENTENCE_LENGTH':
      return 'Overall Sentence Length'
    case 'UNSUPPORTED':
      return 'Unsupported Period'
    default: {
      // Fallback for any unhandled types: convert to Title Case
      // This ensures that if new types are added, they get a reasonable default display
      const ensuredType: string = type || '' // Ensure type is a string for manipulation
      return ensuredType
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    }
  }
}

export const periodLengthToSentenceLength = (periodLength: PeriodLength): SentenceLength => {
  if (periodLength) {
    // console.log("***********", periodLength.periodOrder.split(','))
   const test =  {
      description: getDisplayDescription(periodLength.periodLengthType),
      ...(typeof periodLength.days === 'number' ? { days: String(periodLength.days) } : {}),
      ...(typeof periodLength.weeks === 'number' ? { weeks: String(periodLength.weeks) } : {}),
      ...(typeof periodLength.months === 'number' ? { months: String(periodLength.months) } : {}),
      ...(typeof periodLength.years === 'number' ? { years: String(periodLength.years) } : {}),
      periodOrder: periodLength.periodOrder.split(','),
      periodLengthType: periodLength.periodLengthType,
      uuid: periodLength.periodLengthUuid,
    } as SentenceLength
    console.log('********-----------', test)
    return test;
  }
  return null
}

type PeriodLength = {
  /** Format: int32 */
  years?: number
  /** Format: int32 */
  months?: number
  /** Format: int32 */
  weeks?: number
  /** Format: int32 */
  days?: number
  periodOrder: string
  /** @enum {string} */
  periodLengthType:
    | 'SENTENCE_LENGTH'
    | 'CUSTODIAL_TERM'
    | 'LICENCE_PERIOD'
    | 'TARIFF_LENGTH'
    | 'TERM_LENGTH'
    | 'OVERALL_SENTENCE_LENGTH'
    | 'UNSUPPORTED'
  /** Format: uuid */
  periodLengthUuid: string
}
