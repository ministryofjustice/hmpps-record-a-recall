import { z } from 'zod'

/**
 * NOMIS ID validation
 * Format: Letter followed by 4 digits followed by 2 letters (e.g., A1234BC)
 */
export const nomisIdSchema = z
  .string()
  .min(1, 'Enter a NOMIS ID')
  .regex(/^[A-Z]\d{4}[A-Z]{2}$/, 'NOMIS ID must be in the format A1234BC')
  .transform(val => val.toUpperCase())

/**
 * Recall type validation
 */
export const recallTypeSchema = z.enum([
  'STANDARD',
  '14_DAY_FIXED_TERM',
  '28_DAY_FIXED_TERM',
  '14_DAY_FIXED_TERM_FROM_HDC',
  '28_DAY_FIXED_TERM_FROM_HDC',
  'HDC_RECALLED_FROM_CURFEW_CONDITIONS',
  'HDC_RECALLED_FROM_INABILITY_TO_MONITOR',
])
/**
 * Yes/No boolean radio validation
 */
export const yesNoSchema = z.enum(['true', 'false']).transform(val => val === 'true')

/**
 * Multiple checkbox selection validation
 */
export function multiSelectSchema<T extends string>(
  options: readonly T[],
  errorMessage = 'Select at least one option',
): z.ZodSchema<T[]> {
  return z
    .array(z.enum(options as readonly [T, ...T[]]))
    .min(1, errorMessage)
    .transform(val => [...new Set(val)]) // Remove duplicates
}

/**
 * Sentence type validation
 */
export const sentenceTypeSchema = z.enum([
  'ORA',
  'BOTUS',
  'SLED',
  'CJA_03',
  'LASPO_AR',
  'LASPO_DR',
  'SEC_91',
  'SEC_236A',
  'SEC_250',
  'SEC_252A',
])

/**
 * Creates a conditional validation schema
 * The field is required only if the condition is met
 */
export function conditionalSchema<T>(
  condition: boolean,
  schema: z.ZodSchema<T>,
  optionalSchema?: z.ZodSchema<T | undefined>,
): z.ZodSchema<T | undefined> {
  if (condition) {
    return schema
  }
  return optionalSchema || schema.optional()
}
