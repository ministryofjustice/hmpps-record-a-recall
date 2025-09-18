import { z } from 'zod'
import { yesNoSchema } from '../../utils/commonValidators'

/**
 * Confirm cancel validation schema
 * Validates user confirmation to cancel recording a recall
 */
export const confirmCancelSchema = z.object({
  confirmCancel: yesNoSchema.refine(val => val !== undefined, {
    message: 'Select if you are sure you want to cancel recording a recall',
  }),
})

export type ConfirmCancelData = z.infer<typeof confirmCancelSchema>

// Register field labels for better error messages
export const confirmCancelFieldLabels = {
  confirmCancel: 'if you are sure you want to cancel recording a recall',
}
