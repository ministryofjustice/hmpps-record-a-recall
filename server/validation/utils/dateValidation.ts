import { z } from 'zod'
import { DateTime } from 'luxon'

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

  const dt = DateTime.fromObject(
    {
      year: yearNum,
      month: monthNum,
      day: dayNum,
    },
    { zone: 'Europe/London' },
  )

  return dt.isValid ? dt.toJSDate() : null
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
        const today = DateTime.now().setZone('Europe/London').endOf('day')
        const inputDate = DateTime.fromJSDate(date)
        return inputDate <= today
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
        message: `${fieldName} must be after ${DateTime.fromJSDate(options.mustBeAfter).toFormat('d MMMM yyyy')}`,
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
    const dt = DateTime.fromISO(input)
    return dt.isValid ? dt.toJSDate() : null
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
        const today = DateTime.now().setZone('Europe/London').endOf('day')
        const inputDate = DateTime.fromJSDate(date)
        return inputDate <= today
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
