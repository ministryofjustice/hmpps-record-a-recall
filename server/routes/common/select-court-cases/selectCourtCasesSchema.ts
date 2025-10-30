import { z } from 'zod'

const REQUIRED_ERROR = 'Select whether this case had an active sentence'

export const selectCourtCasesSchema = z.object({
  activeSentenceChoice: z
    .string()
    .optional()
    .refine(val => val === 'YES' || val === 'NO', { message: REQUIRED_ERROR }),
})

export type SelectCourtCasesForm = z.infer<typeof selectCourtCasesSchema>
