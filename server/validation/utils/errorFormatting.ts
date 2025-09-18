import { ZodError, ZodIssue } from 'zod'

/**
 * GOV.UK Design System Error Summary format
 */
export interface GovUkErrorSummaryItem {
  text: string
  href: string
}

/**
 * GOV.UK Design System Field Error format
 */
export interface GovUkFieldError {
  text: string
}

/**
 * Formatted errors for GOV.UK templates
 */
export interface FormattedErrors {
  errors: Record<string, GovUkFieldError>
  errorSummary: GovUkErrorSummaryItem[]
}

/**
 * Maps common error types to user-friendly messages
 */
const ERROR_TYPE_MESSAGES: Record<string, (fieldName: string, issue: ZodIssue) => string> = {
  dateMissingDay: fieldName => `${fieldName} must include a day`,
  dateMissingMonth: fieldName => `${fieldName} must include a month`,
  dateMissingYear: fieldName => `${fieldName} must include a year`,
  dateMissingDayAndMonth: fieldName => `${fieldName} must include a day and month`,
  dateMissingDayAndYear: fieldName => `${fieldName} must include a day and year`,
  dateMissingMonthAndYear: fieldName => `${fieldName} must include a month and year`,
  dateInvalid: fieldName => `${fieldName} must be a real date`,
  dateTodayOrInPast: fieldName => `${fieldName} must be today or in the past`,
  required: fieldName => `Enter ${fieldName.toLowerCase()}`,
  invalid_type: fieldName => `${fieldName} is invalid`,
  too_small: (fieldName, issue: any) => {
    if (issue.minimum === 1) return `Select ${fieldName.toLowerCase()}`
    return `${fieldName} must be at least ${issue.minimum}`
  },
  too_big: (fieldName, issue: any) => `${fieldName} must be no more than ${issue.maximum}`,
}

/**
 * Formats a field name for display in error messages
 * Converts camelCase to human-readable format
 */
export function formatFieldName(fieldName: string, fieldLabels?: Record<string, string>): string {
  if (fieldLabels && fieldLabels[fieldName]) {
    return fieldLabels[fieldName]
  }

  // Convert camelCase to human readable
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
    .replace(/^./, str => str.toUpperCase())
}

/**
 * Extracts field name from a Zod error path
 * Handles nested paths and array indices
 */
export function getFieldNameFromPath(path: (string | number | symbol)[]): string {
  // Filter out array indices and join with dots
  return path.filter(p => typeof p === 'string').join('.')
}

/**
 * Formats a single Zod issue into a user-friendly error message
 */
export function formatErrorMessage(issue: ZodIssue, fieldLabels?: Record<string, string>): string {
  const fieldName = getFieldNameFromPath(issue.path)
  const displayName = formatFieldName(fieldName, fieldLabels)

  // Check for custom error in the issue message
  if (issue.message && issue.message !== 'Required' && issue.message !== 'Invalid type') {
    return issue.message
  }

  // Check for preprocessor error messages
  if (issue.code === 'custom' && issue.params?.error) {
    const errorType = issue.params.error
    const messageGenerator = ERROR_TYPE_MESSAGES[errorType]
    if (messageGenerator) {
      return messageGenerator(displayName, issue)
    }
  }

  // Use error type mapping
  const messageGenerator = ERROR_TYPE_MESSAGES[issue.code]
  if (messageGenerator) {
    return messageGenerator(displayName, issue)
  }

  // Default message
  return issue.message || `${displayName} is invalid`
}

/**
 * Formats Zod errors for GOV.UK Design System templates
 * Converts ZodError to the format expected by govukErrorSummary and field error messages
 */
export function formatZodErrorsForView(error: ZodError, fieldLabels?: Record<string, string>): FormattedErrors {
  const errorSummary: GovUkErrorSummaryItem[] = []
  const errors: Record<string, GovUkFieldError> = {}
  const processedFields = new Set<string>()

  error.issues.forEach(issue => {
    const fieldName = getFieldNameFromPath(issue.path)

    // Skip if we've already processed this field (only show first error per field)
    if (processedFields.has(fieldName)) {
      return
    }
    processedFields.add(fieldName)

    const errorMessage = formatErrorMessage(issue, fieldLabels)

    // Add to field errors
    errors[fieldName] = { text: errorMessage }

    // Add to error summary
    errorSummary.push({
      text: errorMessage,
      href: `#${fieldName}`,
    })
  })

  return { errors, errorSummary }
}

/**
 * Merges Zod validation errors with existing errors
 * Useful when combining multiple validation passes
 */
export function mergeErrors(existing: FormattedErrors, newErrors: FormattedErrors): FormattedErrors {
  return {
    errors: { ...existing.errors, ...newErrors.errors },
    errorSummary: [...existing.errorSummary, ...newErrors.errorSummary],
  }
}

/**
 * Creates a formatted error for a single field
 * Useful for custom validation logic outside of Zod
 */
export function createFieldError(fieldName: string, message: string): FormattedErrors {
  return {
    errors: {
      [fieldName]: { text: message },
    },
    errorSummary: [
      {
        text: message,
        href: `#${fieldName}`,
      },
    ],
  }
}

/**
 * Checks if there are any errors
 */
export function hasErrors(errors: FormattedErrors): boolean {
  return Object.keys(errors.errors).length > 0
}
