import { z } from 'zod'

export const searchSchema = z.object({
  nomisId: z
    .string()
    .transform(val => val.trim().toUpperCase())
    .pipe(z.string().min(1, 'Enter a NOMIS ID').max(7, 'NOMIS ID must be 7 characters or less')),
})

export type SearchData = z.infer<typeof searchSchema>
