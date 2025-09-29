import { z } from 'zod'

/**
 * Confirm cancel validation schema
 * Validates user confirmation to cancel recording a recall
 */
export const confirmCancelSchema = z.object({
  confirmCancel: z.enum(['true', 'false'], {
    message: 'Select yes if you are sure you want to cancel recording a recall',
  }),
})

export type ConfirmCancelData = z.infer<typeof confirmCancelSchema>

// Register field labels for better error messages
export const confirmCancelFieldLabels = {
  confirmCancel: 'if you are sure you want to cancel recording a recall',
}
