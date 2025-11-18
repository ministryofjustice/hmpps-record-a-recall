import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../middleware/validationMiddleware'
import { BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, dateValidation, futureDateValidation } from '../schema/dateValidation'
import { datePartsToDate } from '../../../utils/utils'

const MISSING_IN_CUSTODY_SELECTION = 'Select whether the person was in prison when the recall was made'

export const returnToCustodyDateSchemaFactory = () => async (req: Request) => {
  const { journeyId } = req.params
  const journey = req.session.recallJourneys[journeyId]
  return createSchema({
    day: z.string().trim().optional(),
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
    inCustodyAtRecall: z.string().trim().optional(),
  })
    .superRefine((val, ctx) => {
      if (val.inCustodyAtRecall === 'false') {
        const parsedDate = dateValidation(val, ctx)
        if (parsedDate) {
          futureDateValidation('Arrest date', parsedDate, ctx)
          if (datePartsToDate(journey.revocationDate) > parsedDate) {
            ctx.addIssue({ code: 'custom', message: `Arrest date cannot be before recall date`, path: ['day'] })
            ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['month'] })
            ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['year'] })
          }
        }
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
}

export type ReturnToCustodyDateForm = z.infer<Awaited<ReturnType<ReturnType<typeof returnToCustodyDateSchemaFactory>>>>
