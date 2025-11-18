import { z } from 'zod'
import { RecallTypes } from '../../../@types/recallTypes'

export const recallTypeSchema = z.object({
  recallType: z.enum(
    Object.values(RecallTypes).map(it => it.code),
    {
      message: 'Select a recall type',
    },
  ),
})

export type RecallTypeForm = z.infer<typeof recallTypeSchema>
