import ValidationService from '../service'

// Import search schemas
import { personSearchSchema, personSearchFieldLabels } from './search/personSearchSchema'

// Import recall schemas
import { revocationDateSchema, revocationDateFieldLabels } from './recall/revocationDateSchema'
import { returnToCustodySchema, returnToCustodyFieldLabels } from './recall/returnToCustodySchema'
import { recallTypeValidationSchema, recallTypeFieldLabels } from './recall/recallTypeSchema'
import { confirmCancelSchema, confirmCancelFieldLabels } from './recall/confirmCancelSchema'

/**
 * Register all schemas with the ValidationService
 * This should be called during application initialization
 */
export function registerAllSchemas(): void {
  // Register search schemas
  ValidationService.registerSchema('personSearch', personSearchSchema)

  // Register recall schemas
  ValidationService.registerSchema('revocationDate', revocationDateSchema)
  ValidationService.registerSchema('returnToCustody', returnToCustodySchema)
  ValidationService.registerSchema('recallType', recallTypeValidationSchema)
  ValidationService.registerSchema('confirmCancel', confirmCancelSchema)

  // Register all field labels
  ValidationService.registerFieldLabels({
    ...personSearchFieldLabels,
    ...revocationDateFieldLabels,
    ...returnToCustodyFieldLabels,
    ...recallTypeFieldLabels,
    ...confirmCancelFieldLabels,
  })
}

// Export all schemas for direct use
export {
  // Search schemas
  personSearchSchema,

  // Recall schemas
  revocationDateSchema,
  returnToCustodySchema,
  recallTypeValidationSchema,
  confirmCancelSchema,
}

// Export type definitions
export type { PersonSearchData } from './search/personSearchSchema'
export type { RevocationDateData } from './recall/revocationDateSchema'
export type { ReturnToCustodyData } from './recall/returnToCustodySchema'
export type { RecallTypeData } from './recall/recallTypeSchema'
export type { ConfirmCancelData } from './recall/confirmCancelSchema'
