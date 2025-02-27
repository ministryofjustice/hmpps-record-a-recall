import { addDays, differenceInCalendarDays, format, isEqual, parse } from 'date-fns'
import { compact } from 'lodash'
import { SummaryListRow } from '../@types/govuk'
import toSummaryListRow from '../helpers/componentHelper'
import { formatLongDate } from '../formatters/formatDate'
import { RecallJourneyData } from '../helpers/formWizardHelper'

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

export function calculateUal(recallDate: string | Date, returnToCustodyDate?: string | Date): number {
  if (!returnToCustodyDate || isEqual(recallDate, returnToCustodyDate)) {
    return 0
  }
  const parsedRecall = recallDate instanceof Date ? recallDate : parse(recallDate, 'yyyy-MM-dd', new Date())

  return differenceInCalendarDays(returnToCustodyDate, addDays(parsedRecall, 1))
}

export function createAnswerSummaryList(
  journeyData: RecallJourneyData,
  editLink: (page: string) => string,
): SummaryListRow[] {
  const sentences = journeyData.eligibleSentenceCount === 1 ? 'sentence' : 'sentences'
  const cases = journeyData.courtCaseCount === 1 ? 'case' : 'cases'
  return compact([
    toSummaryListRow('Date of revocation', formatLongDate(journeyData.recallDate), editLink('recall-date')),
    toSummaryListRow(
      'Arrest date',
      formatLongDate(journeyData.returnToCustodyDate) || 'In prison when recalled',
      editLink('rtc-date'),
    ),
    journeyData.courtCaseCount
      ? toSummaryListRow('Court cases', `${journeyData.courtCaseCount} ${cases}`, editLink('select-cases'))
      : null,
    toSummaryListRow(
      'Sentences',
      `${journeyData.eligibleSentenceCount} ${sentences}`,
      editLink('check-sentences'),
      journeyData.manualCaseSelection ? 'Edit' : 'Review',
    ),
    toSummaryListRow(
      'Recall type',
      journeyData.recallType.description,
      editLink(journeyData.standardOnlyRecall ? 'confirm-recall-type' : 'recall-type'),
    ),
  ])
}
