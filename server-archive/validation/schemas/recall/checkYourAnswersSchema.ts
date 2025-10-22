import { z } from 'zod'

// Check Your Answers is a summary page with no form inputs
// This schema is empty as validation happens on individual pages
export const checkYourAnswersSchema = z.object({})

export type CheckYourAnswersData = z.infer<typeof checkYourAnswersSchema>

// No field labels needed for this summary page
export const checkYourAnswersFieldLabels = {}
