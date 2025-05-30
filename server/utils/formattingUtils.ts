// eslint-disable-next-line import/no-unresolved
import { Term } from 'models'

export function formatTerm(term: Term | undefined): string {
  if (!term) {
    return 'Not available'
  }
  const parts: string[] = []
  if (term.years) {
    parts.push(`${term.years} year${term.years > 1 ? 's' : ''}`)
  }
  if (term.months) {
    parts.push(`${term.months} month${term.months > 1 ? 's' : ''}`)
  }
  if (term.weeks) {
    parts.push(`${term.weeks} week${term.weeks > 1 ? 's' : ''}`)
  }
  if (term.days) {
    parts.push(`${term.days} day${term.days > 1 ? 's' : ''}`)
  }
  return parts.length > 0 ? parts.join(' ') : 'Not specified'
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
