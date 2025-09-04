// Journey flow configuration for recall process
// This file provides the step definitions used by journey-resolver
// NOTE: Required for backward compatibility with existing controllers that use journey validation
// Will be deprecated once all controllers are fully migrated to Express routing patterns

export default {
  '/': {
    entryPoint: true,
    resetJourney: true,
    next: '/revocation-date',
  },
  '/revocation-date': {
    fields: ['revocationDate'],
    next: '/rtc-date',
    template: 'revocation-date',
  },
  '/rtc-date': {
    fields: ['returnToCustodyDate'],
    next: '/check-sentences',
    template: 'rtc-date',
  },
  '/check-sentences': {
    next: '/recall-type',
    template: 'check-sentences',
  },
  '/recall-type': {
    fields: ['recallType'],
    next: [
      {
        fn: (req: { session?: { formData?: Record<string, unknown> } }) => {
          // In manual case selection, court cases are already selected before recall-type
          // So we should go to check-your-answers, not back to select-court-case
          const manualCaseSelection = req.session?.formData?.manualCaseSelection === true
          const courtCasesAlreadySelected = (req.session?.formData?.courtCaseIds as any)?.length > 0

          // If manual journey and court cases already selected, go to check-your-answers
          if (manualCaseSelection && courtCasesAlreadySelected) {
            return true
          }
          return false
        },
        next: '/check-your-answers',
      },
      {
        fn: (req: { session?: { formData?: Record<string, unknown> } }) => {
          // If manual journey but no court cases selected yet (shouldn't happen in normal flow)
          const manualCaseSelection = req.session?.formData?.manualCaseSelection === true
          const courtCasesAlreadySelected = (req.session?.formData?.courtCaseIds as any)?.length > 0

          if (manualCaseSelection && !courtCasesAlreadySelected) {
            return true
          }
          return false
        },
        next: '/select-court-case',
      },
      // Default path for automatic case selection
      '/check-possible',
    ],
    template: 'recall-type',
  },
  '/select-court-case': {
    fields: ['courtCase'],
    next: '/check-sentences',
    template: 'select-court-case',
  },
  '/select-sentence-type': {
    fields: ['sentenceType'],
    next: '/check-your-answers',
    template: 'select-sentence-type',
  },
  '/bulk-sentence-type': {
    fields: ['bulkSentenceType'],
    next: '/check-your-answers',
    template: 'bulk-sentence-type',
  },
  '/multiple-sentence-decision': {
    fields: ['multipleSentenceDecision'],
    next: '/check-your-answers',
    template: 'multiple-sentence-decision',
  },
  '/check-possible': {
    next: '/check-your-answers',
    template: 'check-possible',
  },
  '/check-your-answers': {
    next: '/complete',
    template: 'check-your-answers',
  },
  '/not-possible': {
    template: 'not-possible',
  },
  '/confirm-cancel': {
    fields: ['confirmCancel'],
    template: 'confirm-cancel',
  },
  '/manual-recall-intercept': {
    template: 'manual-recall-intercept',
  },
  '/update-sentence-types-summary': {
    template: 'update-sentence-types-summary',
    next: '/check-sentences',
  },
  '/no-cases-selected': {
    template: 'no-cases-selected',
  },
  '/complete': {
    template: 'complete',
  },
}
