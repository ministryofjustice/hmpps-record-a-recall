import { z } from 'zod'
import { nomisIdSchema } from '../../utils/commonValidators'

/**
 * Person search form validation schema
 * Validates NOMIS ID for searching prisoners
 */
export const personSearchSchema = z.object({
  nomisId: nomisIdSchema,
})

export type PersonSearchData = z.infer<typeof personSearchSchema>

// Register field labels for better error messages
export const personSearchFieldLabels = {
  nomisId: 'NOMIS ID',
}
