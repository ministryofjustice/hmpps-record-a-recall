import { z } from 'zod'

const REQUIRED_ERROR = 'Select whether this case had an active sentence'

export const selectCourtCasesSchema = z.object({
  activeSentenceChoice: z.preprocess(
    v => (v === '' ? undefined : v),
    z.unknown().refine(v => v === 'YES' || v === 'NO' || v === 'NO_AND_FINISHED', { message: REQUIRED_ERROR }),
  ),
})

export type SelectCourtCasesForm = z.infer<typeof selectCourtCasesSchema>
