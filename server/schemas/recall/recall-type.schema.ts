import { z } from 'zod'

// Get all valid recall type codes
const validRecallTypeCodes = ['LR', 'FTR_14', 'FTR_28', 'FTR_HDC_14', 'FTR_HDC_28', 'CUR_HDC', 'IN_HDC'] as const

// Schema for recall type selection
export const recallTypeSchema = z.object({
  recallType: z.enum(validRecallTypeCodes).describe('The type of recall to be recorded'),
})

export type RecallTypeFormData = z.infer<typeof recallTypeSchema>
