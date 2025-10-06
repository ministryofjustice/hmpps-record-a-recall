import { z } from 'zod'

export const bulkSentenceTypeSchema = z.object({
  sentenceType: z
    .string({
      message: 'Select a sentence type',
    })
    .min(1, 'Select a sentence type'),
})

export type BulkSentenceTypeData = z.infer<typeof bulkSentenceTypeSchema>

export const bulkSentenceTypeFieldLabels = {
  sentenceType: 'Sentence type',
}
