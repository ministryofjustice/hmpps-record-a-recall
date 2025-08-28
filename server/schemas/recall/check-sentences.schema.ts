import { z } from 'zod'

/**
 * Schema for the check-sentences step validation
 * This step displays sentence information and allows users to confirm before proceeding
 * It doesn't have user input fields, just a confirmation to proceed
 */
export const checkSentencesSchema = z
  .object({
    // No user input fields required for this step
    // This is primarily a display/confirmation page
    // Navigation is handled through buttons that just trigger POST without data
  })
  .strict()

export type CheckSentencesData = z.infer<typeof checkSentencesSchema>
