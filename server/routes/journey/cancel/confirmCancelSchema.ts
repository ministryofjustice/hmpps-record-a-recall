import { z } from 'zod'

const REQUIRED_ERROR = 'Select whether you want to cancel or not'

export const confirmCancelSchema = z.object({
  confirmCancel: z.preprocess(
    v => (v === '' ? undefined : v),
    z.unknown().refine(v => v === 'YES' || v === 'NO', { message: REQUIRED_ERROR }),
  ),
})

export type ConfirmCancelForm = z.infer<typeof confirmCancelSchema>
