import { z } from 'zod'

const OPTION_REQUIRED_MESSAGE = 'Select if you are sure you want to delete the recall'

export const confirmDeleteRecallSchema = z.object({
  confirmDeleteRecall: z.enum(['YES', 'NO'], { message: OPTION_REQUIRED_MESSAGE }),
})

export type ConfirmDeleteRecallForm = z.infer<typeof confirmDeleteRecallSchema>
