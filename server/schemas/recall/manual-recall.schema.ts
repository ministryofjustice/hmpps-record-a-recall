import { z } from 'zod'

// Schema for manual recall intercept decision
export const manualRecallInterceptSchema = z.object({
  manualRecallDecision: z
    .enum(['continue', 'manual'] as const)
    .describe('Decision on whether to continue with automatic recall or switch to manual'),
})

// Schema for no cases selected page
export const noCasesSelectedSchema = z.object({
  acknowledgement: z
    .enum(['acknowledged'] as const)
    .optional()
    .describe('Acknowledgement that no cases were selected'),
})

export type ManualRecallInterceptFormData = z.infer<typeof manualRecallInterceptSchema>
export type NoCasesSelectedFormData = z.infer<typeof noCasesSelectedSchema>
