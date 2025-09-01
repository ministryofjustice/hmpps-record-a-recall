import { z } from 'zod'

// Schema for check your answers confirmation
export const checkAnswersSchema = z.object({
  confirmation: z
    .enum(['confirmed'] as const)
    .optional()
    .describe('Confirmation that the recall details are correct'),
})

// Combined schema for complete recall validation
export const completeRecallSchema = z.object({
  // Dates
  revocationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .describe('The revocation date'),
  returnToCustodyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .describe('The return to custody date'),

  // Recall type
  recallType: z.string().min(1, 'Recall type is required').describe('The type of recall'),

  // Court cases and sentences
  courtCaseIds: z
    .array(z.string())
    .min(1, 'At least one court case must be selected')
    .describe('Selected court case IDs'),
  sentenceIds: z.array(z.string()).min(1, 'At least one sentence must be selected').describe('Selected sentence IDs'),

  // Optional fields
  notes: z.string().optional().describe('Additional notes about the recall'),
})

export type CheckAnswersFormData = z.infer<typeof checkAnswersSchema>
export type CompleteRecallFormData = z.infer<typeof completeRecallSchema>
