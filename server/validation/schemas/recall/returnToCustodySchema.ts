import { z } from 'zod'
import { datePartsSchema } from '../../utils/dateValidation'
import { yesNoSchema } from '../../utils/commonValidators'

const rtcDateSchema = datePartsSchema('returnToCustodyDate', {
  todayOrInPast: true,
})

/**
 * Return to custody validation schema
 * Validates whether person was in prison and RTC date if not
 */
export const returnToCustodySchema = z
  .object({})
  .loose()
  .transform((input, ctx) => {
    // Parse yes/no value
    const inPrisonResult = yesNoSchema.safeParse(input.inPrisonAtRecall)

    let inPrisonAtRecall
    if (inPrisonResult.success) {
      inPrisonAtRecall = inPrisonResult.data
    }

    // Parse RTC date if person was not in prison
    let returnToCustodyDate = null
    if (inPrisonAtRecall === false) {
      const rtcResult = rtcDateSchema.safeParse(input)
      if (rtcResult.success) {
        returnToCustodyDate = rtcResult.data
      } else if (rtcResult.error) {
        // Add date validation errors to context
        rtcResult.error.issues.forEach(issue => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: issue.message,
            path: issue.path,
          })
        })
      }
    }

    return {
      ...input,
      inPrisonAtRecall,
      returnToCustodyDate,
    }
  })
  .superRefine((data, ctx) => {
    // Validate inPrisonAtRecall is present
    if (data.inPrisonAtRecall === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inPrisonAtRecall'],
        message: 'Select whether the person was in prison when the recall was made',
      })
    }

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

export const returnToCustodyFieldLabels = {
  inPrisonAtRecall: 'Whether the person was in prison when the recall was made',
  returnToCustodyDate: 'Return to custody date',
}
