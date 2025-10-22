import { z } from 'zod'

/**
 * Recall type validation schema
 * Validates the type of recall being recorded
 */
export const recallTypeSchema = z.object({
  recallType: z.enum(['LR', 'FTR_14', 'FTR_28', 'FTR_HDC_14', 'FTR_HDC_28', 'CUR_HDC', 'IN_HDC'], {
    message: 'Select a recall type',
  }),
})

export type RecallTypeData = z.infer<typeof recallTypeSchema>

// IMPORTANT: Export field labels for better error messages
export const recallTypeFieldLabels = {
  recallType: 'Recall type',
}
