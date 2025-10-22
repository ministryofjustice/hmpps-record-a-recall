/**
 * Constants related to court functionality
 */

export const COURT_MESSAGES = {
  NAME_NOT_AVAILABLE: 'Court name not available',
} as const

export type CourtMessage = (typeof COURT_MESSAGES)[keyof typeof COURT_MESSAGES]
