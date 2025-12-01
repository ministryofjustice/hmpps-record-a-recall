import { z } from 'zod'

export const noCasesSelectedSchema = z.object({})

export type NoCasesSelectedForm = z.infer<typeof noCasesSelectedSchema>
