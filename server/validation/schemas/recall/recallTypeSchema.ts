import { z } from 'zod'
import { recallTypeSchema as baseRecallTypeSchema } from '../../utils/commonValidators'

/**
 * Recall type validation schema
 * Validates the type of recall being recorded
 */
export const recallTypeValidationSchema = z.object({
  recallType: baseRecallTypeSchema,
})

export type RecallTypeData = z.infer<typeof recallTypeValidationSchema>

// Register field labels for better error messages
export const recallTypeFieldLabels = {
  recallType: 'Recall type',
}
