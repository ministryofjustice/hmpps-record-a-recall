import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../middleware/validationMiddleware'
import { dateValidation, futureDateValidation } from '../schema/dateValidation'
import { formatDate } from '../../../utils/utils'
import RecallService from '../../../services/recallService'

const BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED = ''
const AFTER_SENTENCE_DATE_ERROR = 'Revocation date must be after the earliest sentence date'

export const revocationDateSchemaFactory = (recallService: RecallService) => async (req: Request) => {
  const { nomsId, journeyId } = req.params
  const journey = req.session.createRecallJourneys[journeyId]
  const { username } = req.user
  const latestRevocationDate = await recallService.getLatestRevocationDate(nomsId, username)
  return createSchema({
    day: z.string().trim().optional(),
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
  })
    .superRefine((val, ctx) => {
      const parsedDate = dateValidation(val, ctx)
      if (parsedDate) {
        if (
          journey.crdsValidationResult.earliestSentenceDate &&
          new Date(journey.crdsValidationResult.earliestSentenceDate) > parsedDate
        ) {
          ctx.addIssue({ code: 'custom', message: AFTER_SENTENCE_DATE_ERROR, path: ['day'] })
          ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['month'] })
          ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['year'] })
        }
        futureDateValidation('Revocation date', parsedDate, ctx)

        if (!ctx.issues.length) {
          if (latestRevocationDate && latestRevocationDate > parsedDate) {
            ctx.addIssue({
              code: 'custom',
              message: `Revocation date must be after previously recorded recall date ${formatDate(latestRevocationDate.toString())}`,
              path: ['day'],
            })
            ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['month'] })
            ctx.addIssue({ code: 'custom', message: BLANK_MESSAGE_SO_FIELD_HIGHLIGHTED, path: ['year'] })
          }

          // TODO Edit validation will need to be different here.
        }
      }
    })
    .transform(val => {
      const { day, month, year } = val
      return !day && !month && !year
        ? {}
        : {
            day: Number(day),
            month: Number(month),
            year: Number(year),
          }
    })
}

export type RevocationDateForm = z.infer<Awaited<ReturnType<ReturnType<typeof revocationDateSchemaFactory>>>>
