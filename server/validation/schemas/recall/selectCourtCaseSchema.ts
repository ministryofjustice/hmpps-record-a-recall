import { z } from 'zod'

export const selectCourtCaseSchema = z.object({
  activeSentenceChoice: z.enum(['YES', 'NO'], {
    message: 'Select whether this case had an active sentence',
  }),
})

export type SelectCourtCaseData = z.infer<typeof selectCourtCaseSchema>

export const selectCourtCaseFieldLabels = {
  activeSentenceChoice: 'Active sentence selection',
}
