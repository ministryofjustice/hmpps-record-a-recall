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
 * Prison number validation
 * Similar to NOMIS ID but may have variations
 */
export const prisonNumberSchema = z
  .string()
  .min(1, 'Enter a prison number')
  .regex(/^[A-Z]\d{4}[A-Z]{2}$/, 'Prison number must be in the format A1234BC')
  .transform(val => val.toUpperCase())

/**
 * Court case number validation
 * Various formats accepted
 */
export const courtCaseNumberSchema = z
  .string()
  .min(1, 'Enter a court case number')
  .regex(/^[A-Z0-9\-\/]+$/i, 'Court case number can only contain letters, numbers, hyphens and forward slashes')

/**
 * Recall type validation
 */
export const recallTypeSchema = z.enum(['FIXED', 'STANDARD', 'AUTOMATIC', 'DISCRETIONARY'])

/**
 * Yes/No boolean radio validation
 */
export const yesNoSchema = z.enum(['true', 'false']).transform(val => val === 'true')

/**
 * Optional Yes/No boolean radio
 */
export const optionalYesNoSchema = z
  .enum(['true', 'false'])
  .transform(val => val === 'true')
  .optional()

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
 * Text input with length constraints
 */
export function textInputSchema(options?: { minLength?: number; maxLength?: number; required?: boolean }) {
  let schema = z.string()

  if (options?.required) {
    schema = schema.min(1, 'This field is required')
  }

  if (options?.minLength) {
    schema = schema.min(options.minLength, `Must be at least ${options.minLength} characters`)
  }

  if (options?.maxLength) {
    schema = schema.max(options.maxLength, `Must be no more than ${options.maxLength} characters`)
  }

  return schema
}

/**
 * Alphanumeric validation (no special characters)
 */
export const alphanumericSchema = z.string().regex(/^[A-Z0-9\s]*$/i, 'Must not contain special characters')

/**
 * Numeric string validation
 */
export const numericStringSchema = z.string().regex(/^\d+$/, 'Must only include numbers')

/**
 * Email validation
 */
export const emailSchema = z.string().email('Enter a valid email address')

/**
 * Phone number validation (UK format)
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^(?:0|\+44)[1-9]\d{8,9}$/, 'Enter a valid UK phone number')
  .optional()

/**
 * Postcode validation (UK format)
 */
export const postcodeSchema = z
  .string()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 'Enter a valid UK postcode')
  .transform(val => val.toUpperCase().replace(/\s+/g, ' ').trim())

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

/**
 * Validates that at least one field in a group has a value
 */
export function atLeastOneFieldSchema(fields: string[], errorMessage = 'At least one field must be filled') {
  return z.object({}).refine(
    data => {
      const values = Object.entries(data as Record<string, unknown>)
        .filter(([key]) => fields.includes(key))
        .map(([, value]) => value)

      return values.some(value => value !== undefined && value !== '' && value !== null)
    },
    {
      message: errorMessage,
      path: [fields[0]], // Show error on first field
    },
  )
}
