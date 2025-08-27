import { z } from 'zod'
import { parse, startOfToday, isEqual, isBefore, isValid } from 'date-fns'

const dateTodayOrInPastRefinement = (val: string) => {
  if (!val) return true
  const date = parse(val, 'yyyy-MM-dd', new Date())
  if (!isValid(date)) return false
  const today = startOfToday()
  return isEqual(date, today) || isBefore(date, today)
}

export const revocationDateSchema = z.object({
  revocationDate: z
    .string()
    .min(1, 'Enter the date of revocation')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(dateTodayOrInPastRefinement, 'Date must be today or in the past'),
})

export const rtcDateSchema = z
  .object({
    inPrisonAtRecall: z.enum(['true', 'false']),
    returnToCustodyDate: z.string().optional(),
  })
  .refine(
    data => {
      if (data.inPrisonAtRecall === 'false') {
        if (!data.returnToCustodyDate || data.returnToCustodyDate.length === 0) {
          return false
        }
        const date = parse(data.returnToCustodyDate, 'yyyy-MM-dd', new Date())
        if (!isValid(date)) return false
        const today = startOfToday()
        return isEqual(date, today) || isBefore(date, today)
      }
      return true
    },
    {
      message: 'Enter the date they were arrested',
      path: ['returnToCustodyDate'],
    },
  )

export type RevocationDateData = z.infer<typeof revocationDateSchema>
export type RtcDateData = z.infer<typeof rtcDateSchema>
