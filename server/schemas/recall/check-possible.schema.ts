import { z } from 'zod'

// Schema for check possible page
export const checkPossibleSchema = z.object({
  confirmPossible: z.enum(['yes', 'no'] as const).describe('Confirmation whether the recall can proceed'),
})

// Schema for update sentence types summary
export const updateSentenceTypesSummarySchema = z.object({
  confirmUpdate: z
    .enum(['confirmed'] as const)
    .optional()
    .describe('Confirmation of sentence type updates'),
})

export type CheckPossibleFormData = z.infer<typeof checkPossibleSchema>
export type UpdateSentenceTypesSummaryFormData = z.infer<typeof updateSentenceTypesSummarySchema>
