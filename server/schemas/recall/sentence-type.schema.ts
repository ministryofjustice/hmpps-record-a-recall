import { z } from 'zod'

// Schema for sentence type selection
export const sentenceTypeSchema = z.object({
  sentenceType: z
    .string()
    .uuid({ message: 'Please select a valid sentence type' })
    .describe('The UUID of the selected sentence type'),
})

// Schema for bulk sentence type update
export const bulkSentenceTypeSchema = z.object({
  sentenceTypes: z
    .record(
      z.string().uuid(), // key is sentence UUID
      z.string().uuid(), // value is sentence type UUID
    )
    .refine(data => Object.keys(data).length > 0, {
      message: 'Please select sentence types for all sentences',
    })
    .describe('Map of sentence UUIDs to their selected sentence type UUIDs'),
})

// Schema for multiple sentence decision
export const multipleSentenceDecisionSchema = z.object({
  multipleSentenceDecision: z
    .enum(['all', 'some'] as const)
    .describe('Decision on whether to recall all or some sentences'),
})

export type SentenceTypeFormData = z.infer<typeof sentenceTypeSchema>
export type BulkSentenceTypeFormData = z.infer<typeof bulkSentenceTypeSchema>
export type MultipleSentenceDecisionFormData = z.infer<typeof multipleSentenceDecisionSchema>
