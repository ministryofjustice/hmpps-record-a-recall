import { datePartsSchema } from '../../utils/dateValidation'

/**
 * Revocation date validation schema
 * Validates the recall/revocation date with business rules
 */
export const revocationDateSchema = datePartsSchema('revocationDate', {
  required: true,
  todayOrInPast: true,
})

export type RevocationDateData = { revocationDate: Date | null }

// Register field labels for better error messages
export const revocationDateFieldLabels = {
  revocationDate: 'Recall date',
}