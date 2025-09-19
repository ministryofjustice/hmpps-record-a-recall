import { z } from 'zod'
import { format, isAfter, isValid, parse, parseISO, startOfDay } from 'date-fns'

/**
 * Parses date parts from GOV.UK form inputs
 * GOV.UK date inputs use separate day, month, year fields
 */
export function parseDateParts(
  day: string | undefined,
  month: string | undefined,
  year: string | undefined,
): Date | null {
  const dayNum = parseInt(day || '', 10)
  const monthNum = parseInt(month || '', 10)
  const yearNum = parseInt(year || '', 10)

  if (!dayNum || !monthNum || !yearNum) {
    return null
  }

  // Create a date string in format that parse can handle
  // Note: months are 1-indexed in the input but JavaScript Date expects 0-indexed
  const dateString = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
  const date = parse(dateString, 'yyyy-MM-dd', new Date())

  return isValid(date) ? date : null
}

/**
 * Creates a Zod schema for GOV.UK date input fields
 * This preprocessor extracts day/month/year from the form data
 * and converts them into a Date object for validation
 */
export function datePartsSchema(
  fieldName: string,
  options?: { required?: boolean; todayOrInPast?: boolean; mustBeAfter?: Date },
) {
  // Create a schema that processes and validates the date parts
  const schema = z
    .object({})
    .passthrough()
    .transform(input => {
      const data = input as Record<string, unknown>
      const day = data[`${fieldName}-day`] as string | undefined
      const month = data[`${fieldName}-month`] as string | undefined
      const year = data[`${fieldName}-year`] as string | undefined

      const hasDay = day !== undefined && day !== ''
      const hasMonth = month !== undefined && month !== ''
      const hasYear = year !== undefined && year !== ''

      // If all fields are empty and not required, return null
      if (!hasDay && !hasMonth && !hasYear && !options?.required) {
        return { date: null, error: null }
      }

      // For required fields, if all are empty, return error
      if (options?.required && !hasDay && !hasMonth && !hasYear) {
        return {
          date: null as Date | null,
          error: `Enter the ${fieldName
            .toLowerCase()
            .replace(/([A-Z])/g, ' $1')
            .trim()}`,
        }
      }

      // Check for partial dates
      if (hasDay || hasMonth || hasYear) {
        if (!hasDay && hasMonth && hasYear) {
          return { date: null, error: `${fieldName} must include a day` }
        }
        if (hasDay && !hasMonth && hasYear) {
          return { date: null, error: `${fieldName} must include a month` }
        }
        if (hasDay && hasMonth && !hasYear) {
          return { date: null, error: `${fieldName} must include a year` }
        }
        if (!hasDay && !hasMonth && hasYear) {
          return { date: null, error: `${fieldName} must include a day and month` }
        }
        if (!hasDay && hasMonth && !hasYear) {
          return { date: null, error: `${fieldName} must include a day and year` }
        }
        if (hasDay && !hasMonth && !hasYear) {
          return { date: null, error: `${fieldName} must include a month and year` }
        }
      }

      // Try to parse the date
      const date = parseDateParts(day, month, year)
      if (!date && hasDay && hasMonth && hasYear) {
        return { date: null, error: `${fieldName} must be a real date` }
      }

      return { date, error: null }
    })
    .superRefine((result, ctx) => {
      if (result.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error,
        })
      }
    })
    .transform(result => result.date)

  // Add additional refinements for business rules
  let finalSchema = schema

  if (options?.todayOrInPast) {
    finalSchema = finalSchema.refine(
      date => {
        if (!date) return true
        const today = new Date()
        // Set to end of today to allow dates from today
        today.setHours(23, 59, 59, 999)
        return date <= today
      },
      {
        message: `${fieldName} must be today or in the past`,
      },
    )
  }

  if (options?.mustBeAfter) {
    finalSchema = finalSchema.refine(
      date => {
        if (!date) return true
        return date > options.mustBeAfter
      },
      {
        message: `${fieldName} must be after ${format(options.mustBeAfter, 'd MMMM yyyy')}`,
      },
    )
  }

  return finalSchema
}

/**
 * Extracts date from preprocessed form data
 * Used when the date has already been assembled into YYYY-MM-DD format
 */
export function dateStringSchema(fieldName: string, options?: { required?: boolean; todayOrInPast?: boolean }) {
  const baseSchema = z.preprocess((input: unknown) => {
    if (!input || typeof input !== 'string') return null
    const date = parseISO(input)
    return isValid(date) ? date : null
  }, z.date().nullable())

  let schema = baseSchema

  if (options?.required) {
    schema = schema.refine(date => date !== null, {
      message: `Enter the ${fieldName
        .toLowerCase()
        .replace(/([A-Z])/g, ' $1')
        .trim()}`,
    })
  }

  if (options?.todayOrInPast) {
    schema = schema.refine(
      date => {
        if (!date) return true
        const today = new Date()
        // Set to end of today to allow dates from today
        today.setHours(23, 59, 59, 999)
        return date <= today
      },
      {
        message: `${fieldName} must be today or in the past`,
      },
    )
  }

  return schema
}

/**
 * Validates that one date is after another
 * Used for cross-field date validation
 */
export function dateAfterSchema(fieldName: string, afterFieldName: string, afterDate: Date | null) {
  return z
    .date()
    .nullable()
    .refine(
      date => {
        if (!date || !afterDate) return true
        return date >= afterDate
      },
      {
        message: `${fieldName} must be equal to or after the ${afterFieldName
          .toLowerCase()
          .replace(/([A-Z])/g, ' $1')
          .trim()}`,
      },
    )
}
