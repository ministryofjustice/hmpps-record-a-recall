import { z } from 'zod'

// Schema for court case selection
export const courtCaseSelectionSchema = z.object({
  courtCaseIds: z
    .array(z.string())
    .min(1, { message: 'Please select at least one court case' })
    .describe('The court case IDs to be included in the recall'),
})

// Alternative schema for single court case selection
export const singleCourtCaseSchema = z.object({
  courtCaseId: z
    .string()
    .min(1, { message: 'Please select a court case' })
    .describe('The court case ID to be included in the recall'),
})

export type CourtCaseSelectionFormData = z.infer<typeof courtCaseSelectionSchema>
export type SingleCourtCaseFormData = z.infer<typeof singleCourtCaseSchema>
