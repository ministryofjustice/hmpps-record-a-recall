import { z } from 'zod'
import { datePartsSchema } from '../../utils/dateValidation'
import { yesNoSchema } from '../../utils/commonValidators'

/**
 * Return to custody validation schema
 * Validates whether person was in prison and RTC date if not
 */
export const returnToCustodySchema = z
  .object({
    inPrisonAtRecall: yesNoSchema.refine(val => val !== undefined, {
      message: 'Select whether the person was in prison when the recall was made',
    }),
    returnToCustodyDate: datePartsSchema('returnToCustodyDate', {
      todayOrInPast: true,
    }).optional(),
  })
  .superRefine((data, ctx) => {
    // If person was not in prison (false), RTC date is required
    if (data.inPrisonAtRecall === false && !data.returnToCustodyDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnToCustodyDate'],
        message: 'Enter the date they were arrested',
      })
    }
  })

export type ReturnToCustodyData = z.infer<typeof returnToCustodySchema>

// Register field labels for better error messages
export const returnToCustodyFieldLabels = {
  inPrisonAtRecall: 'Whether the person was in prison when the recall was made',
  returnToCustodyDate: 'Return to custody date',
}
