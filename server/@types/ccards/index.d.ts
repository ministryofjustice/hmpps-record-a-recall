type offenceCard = {
  offenceCode: string
  offenceName: string
  offenceStartDate?: string
  offenceEndDate?: string
  outcome: string
  countNumber: string
  convictionDate: string
  terrorRelated: boolean
  isSentenced: boolean
  custodialSentenceLength?: termLength
  licencePeriodLength?: termLength
  sentenceServeType: 'CONSECUTIVE' | 'CONCURRENT' | 'FORTHWITH'
  consecutiveTo: string
  sentenceType: string
  sentenceDate?: string
  actions?: {
    items: actionItem[]
  }
}

type termLength = {
  years: string
  months: string
  weeks: string
  days: string
  periodOrder: string[]
}

type actionItem = {
  text: string
  href: string
}
