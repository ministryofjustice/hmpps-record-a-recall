import { format } from 'date-fns'
import type { DateForm } from 'forms'

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
export const formatDateForDisplay = (date: Date): string => (date ? format(date, 'dd MMM yyyy') : null)

export function getDateFromForm(dateForm: DateForm) {
  const year = parseInt(dateForm.year, 10)
  const month = parseInt(dateForm.month, 10) - 1
  const day = parseInt(dateForm.day, 10)
  return new Date(year, month, day)
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
