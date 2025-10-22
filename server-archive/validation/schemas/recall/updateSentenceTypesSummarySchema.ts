import { z } from 'zod'

// This page doesn't have form inputs to validate as it's a summary page.
// Validation is done in the POST handler to ensure all sentences have been updated.
// We create an empty schema to register with the validation service.
export const updateSentenceTypesSummarySchema = z.object({})

export type UpdateSentenceTypesSummaryData = z.infer<typeof updateSentenceTypesSummarySchema>

// Export field labels (empty as there are no form fields)
export const updateSentenceTypesSummaryFieldLabels = {}
