// selectCourtCasesSchemas.ts
import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../middleware/validationMiddleware'

const REQUIRED_ERROR = 'Select whether this case had an active sentence'

export const selectCourtCasesSchemaFactory = () => async (req: Request) => {
  return createSchema({
    activeSentenceChoice: z.preprocess(
      v => (typeof v === 'string' ? v : ''),
      z.string().min(1, { message: REQUIRED_ERROR }),
    ),
  })
}

export type SelectCourtCasesForm = z.infer<Awaited<ReturnType<ReturnType<typeof selectCourtCasesSchemaFactory>>>>
