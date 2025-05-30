// eslint-disable-next-line import/no-unresolved
import { Term, Sentence } from 'models'
import { parseISO, format as formatDateFns } from 'date-fns'

export function formatTerm(term: Term | undefined): string {
  if (!term) {
    return 'Not specified'
  }

  const years = typeof term.years === 'number' ? term.years : 0
  const months = typeof term.months === 'number' ? term.months : 0
  const weeks = typeof term.weeks === 'number' ? term.weeks : 0
  const days = typeof term.days === 'number' ? term.days : 0

  const parts: string[] = [
    `${years} year${years !== 1 ? 's' : ''}`,
    `${months} month${months !== 1 ? 's' : ''}`,
    `${weeks} week${weeks !== 1 ? 's' : ''}`,
    `${days} day${days !== 1 ? 's' : ''}`,
  ]

  return parts.join(' ')
}

export function formatSentenceServeType(sentenceServeType?: string, consecutiveToChargeNumber?: string): string {
  if (consecutiveToChargeNumber) {
    return `Consecutive to charge ${consecutiveToChargeNumber}`
  }
  if (sentenceServeType === 'CONCURRENT') {
    return 'Concurrent'
  }
  if (sentenceServeType === 'FORTHWITH') {
    return 'Forthwith'
  }
  return sentenceServeType || 'Not specified'
}

export function calculateOverallSentenceLength(sentences?: Sentence[]): Term {
  const total: Term = { years: 0, months: 0, weeks: 0, days: 0 }

  if (!sentences || sentences.length === 0) {
    return total
  }

  sentences.forEach(sentence => {
    if (sentence.licenceTerm) {
      total.days = (total.days || 0) + (sentence.licenceTerm.days || 0)
      total.weeks = (total.weeks || 0) + (sentence.licenceTerm.weeks || 0)
      total.months = (total.months || 0) + (sentence.licenceTerm.months || 0)
      total.years = (total.years || 0) + (sentence.licenceTerm.years || 0)
    }
  })

  // Carry-overs
  if (total.days && total.days >= 7) {
    total.weeks = (total.weeks || 0) + Math.floor(total.days / 7)
    total.days %= 7
  }
  // Assuming 4 weeks per month
  if (total.weeks && total.weeks >= 4) {
    total.months = (total.months || 0) + Math.floor(total.weeks / 4)
    total.weeks %= 4
  }
  if (total.months && total.months >= 12) {
    total.years = (total.years || 0) + Math.floor(total.months / 12)
    total.months %= 12
  }

  return total
}

export function formatDateStringToDDMMYYYY(isoDateString?: string): string {
  if (!isoDateString) {
    return 'Not available'
  }
  try {
    const dateObj = parseISO(isoDateString)
    return formatDateFns(dateObj, 'dd/MM/yyyy')
  } catch (e) {
    console.error('Error formatting date string:', isoDateString, e)
    return 'Invalid date'
  }
}
