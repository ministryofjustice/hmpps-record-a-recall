import { z } from 'zod'

export const selectSentenceTypeSchema = z.object({
  sentenceType: z
    .string({
      message: 'Select a sentence type',
    })
    .min(1, 'Select a sentence type'),
})

export type SelectSentenceTypeData = z.infer<typeof selectSentenceTypeSchema>

export const selectSentenceTypeFieldLabels = {
  sentenceType: 'Sentence type',
}
