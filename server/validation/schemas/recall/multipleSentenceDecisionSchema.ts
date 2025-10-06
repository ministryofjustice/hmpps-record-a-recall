import { z } from 'zod'

export const multipleSentenceDecisionSchema = z.object({
  sameSentenceType: z.enum(['yes', 'no'], {
    message: 'Select yes if all sentences have the same type, or no to select individually',
  }),
})

export type MultipleSentenceDecisionData = z.infer<typeof multipleSentenceDecisionSchema>

export const multipleSentenceDecisionFieldLabels = {
  sameSentenceType: 'Same sentence type decision',
}
