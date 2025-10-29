import { z } from 'zod'
import { createSchema } from '../../../middleware/validationMiddleware'
import dateValidation from '../schema/dateValidation'

const MISSING_IN_CUSTODY_SELECTION = 'Select whether the person was in prison when the recall was made'

export const returnToCustodyDateSchema = createSchema({
  day: z.string().trim().optional(),
  month: z.string().trim().optional(),
  year: z.string().trim().optional(),
  inCustodyAtRecall: z.string().trim().optional(),
})
  .superRefine((val, ctx) => {
    if (val.inCustodyAtRecall === 'false') {
      dateValidation(val, ctx)
    } else if (val.inCustodyAtRecall !== 'true') {
      ctx.addIssue({ code: 'custom', message: MISSING_IN_CUSTODY_SELECTION, path: ['inCustodyAtRecall'] })
    }
  })
  .transform(val => {
    const { day, month, year } = val
    const inCustodyAtRecall = val.inCustodyAtRecall === 'true'
    return {
      inCustodyAtRecall,
      day: day && !inCustodyAtRecall ? Number(day) : null,
      month: month && !inCustodyAtRecall ? Number(month) : null,
      year: year && !inCustodyAtRecall ? Number(year) : null,
    }
  })

export type ReturnToCustodyDateForm = z.infer<typeof returnToCustodyDateSchema>
