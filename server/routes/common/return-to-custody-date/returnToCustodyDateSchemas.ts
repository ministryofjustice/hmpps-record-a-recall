import { z } from 'zod'
import { createSchema } from '../../../middleware/validationMiddleware'
import dateValidation from '../schema/dateValidation'

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
      // TODO add validation message for no radio button selected.
    }
  })
  .transform(val => {
    const { day, month, year, inCustodyAtRecall } = val
    return {
      inCustodyAtRecall: inCustodyAtRecall === 'true',
      day: !day ? Number(day) : null,
      month: !month ? Number(month) : null,
      year: !year ? Number(year) : null,
    }
  })

export type ReturnToCustodyDateForm = z.infer<typeof returnToCustodyDateSchema>
