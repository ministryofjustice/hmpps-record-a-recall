import { z } from 'zod'

export const recallTypeSchema = z.object({
  recallType: z.string().min(1, 'Select the type of recall'),
})

export const confirmCancelSchema = z.object({
  confirmCancel: z.enum(['true', 'false'], {
    message: 'Select whether you want to cancel',
  }),
})

export const activeSentenceChoiceSchema = z.object({
  activeSentenceChoice: z.string().min(1, 'Select whether this case had an active sentence'),
})

export type RecallTypeData = z.infer<typeof recallTypeSchema>
export type ConfirmCancelData = z.infer<typeof confirmCancelSchema>
export type ActiveSentenceChoiceData = z.infer<typeof activeSentenceChoiceSchema>
