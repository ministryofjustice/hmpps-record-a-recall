import { z } from 'zod'
import { datePartsSchema } from '../../utils/dateValidation'

/**
 * Revocation date validation schema
 * Validates the recall/revocation date with business rules
 */
const baseDateSchema = datePartsSchema('revocationDate', {
  required: true,
  todayOrInPast: true,
})

// Wrap the date schema to return an object with revocationDate property
export const revocationDateSchema = z
  .object({})
  .passthrough()
  .transform((input, ctx) => {
    // Run the date validation on the input
    const dateResult = baseDateSchema.safeParse(input)

    if (!dateResult.success) {
      // Add the validation errors to the context
      dateResult.error.issues.forEach(issue => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: issue.path,
        })
      })
      // Return a minimal object to prevent undefined errors
      return {
        ...input,
        revocationDate: null,
      }
    }

    // Return an object with revocationDate property
    return {
      ...input,
      revocationDate: dateResult.data,
    }
  })

export type RevocationDateData = { revocationDate: Date | null }

// Register field labels for better error messages
export const revocationDateFieldLabels = {
  revocationDate: 'Recall date', // Matches legacy 'nameForErrors'
}
