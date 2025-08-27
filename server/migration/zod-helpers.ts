/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'

// Define FieldConfig type since HMPO doesn't export it properly
interface FieldConfig {
  validate?: any
  formatter?: string[]
  default?: any
  dependent?: {
    field: string
    value: any
  }
  invalidates?: string[]
  [key: string]: any
}

export function migrateFieldToZod(fieldConfig: FieldConfig): z.ZodSchema {
  // Start with a base string schema
  let schema: z.ZodSchema = z.string()

  // First apply formatters as preprocessors (they run before validation)
  const formatters = fieldConfig.formatter || []
  formatters.forEach((formatter: string) => {
    switch (formatter) {
      case 'trim':
        schema = z.preprocess(val => (typeof val === 'string' ? val.trim() : val), schema)
        break
      case 'singlespaces':
        schema = z.preprocess(val => (typeof val === 'string' ? val.replace(/\s+/g, ' ') : val), schema)
        break
      case 'uppercase':
        schema = z.preprocess(val => (typeof val === 'string' ? val.toUpperCase() : val), schema)
        break
      case 'lowercase':
        schema = z.preprocess(val => (typeof val === 'string' ? val.toLowerCase() : val), schema)
        break
      default:
        // Unknown formatter, skip
        break
    }
  })

  // Then apply validators to the preprocessed value
  const validators = Array.isArray(fieldConfig.validate) ? fieldConfig.validate : [fieldConfig.validate].filter(Boolean)

  let hasRequiredValidator = false
  let hasEmailValidator = false
  let minLength: number | undefined
  let maxLength: number | undefined
  let exactLength: number | undefined
  let regexPattern: RegExp | undefined
  let regexMessage: string | undefined

  // Collect all validators first
  validators.forEach((validator: any) => {
    if (validator === 'required') {
      hasRequiredValidator = true
    } else if (validator === 'email') {
      hasEmailValidator = true
    } else if (typeof validator === 'object' && validator.type) {
      switch (validator.type) {
        case 'minlength':
          ;[minLength] = validator.arguments
          break
        case 'maxlength':
          ;[maxLength] = validator.arguments
          break
        case 'exactlength':
          ;[exactLength] = validator.arguments
          break
        case 'regex':
          ;[regexPattern, regexMessage] = validator.arguments
          break
        default:
          // Unknown validator type, skip
          break
      }
    }
  })

  // Build validation schema
  let validationSchema = z.string()

  if (hasEmailValidator) {
    validationSchema = validationSchema.email('Invalid email address')
  }

  if (hasRequiredValidator) {
    validationSchema = validationSchema.min(1, 'This field is required')
  }

  if (exactLength !== undefined) {
    validationSchema = validationSchema.length(exactLength, `Must be exactly ${exactLength} characters`)
  } else {
    if (minLength !== undefined) {
      validationSchema = validationSchema.min(minLength, `Must be at least ${minLength} characters`)
    }
    if (maxLength !== undefined) {
      validationSchema = validationSchema.max(maxLength, `Must be at most ${maxLength} characters`)
    }
  }

  if (regexPattern) {
    validationSchema = validationSchema.regex(regexPattern, regexMessage || 'Invalid format')
  }

  // Combine preprocessing with validation
  if (formatters.length > 0) {
    // Apply validation to the preprocessed value
    schema = z.preprocess(val => {
      let result = val
      formatters.forEach((formatter: string) => {
        if (typeof result === 'string') {
          switch (formatter) {
            case 'trim':
              result = result.trim()
              break
            case 'singlespaces':
              result = result.replace(/\s+/g, ' ')
              break
            case 'uppercase':
              result = result.toUpperCase()
              break
            case 'lowercase':
              result = result.toLowerCase()
              break
            default:
              // Unknown formatter, skip
              break
          }
        }
      })
      return result
    }, validationSchema)
  } else {
    schema = validationSchema
  }

  // Handle default values
  if (fieldConfig.default !== undefined) {
    schema = schema.default(fieldConfig.default)
  }

  return schema
}

export function createFieldDependencies(fields: Record<string, FieldConfig>) {
  const dependencies: Record<string, string[]> = {}
  const invalidations: Record<string, string[]> = {}

  Object.entries(fields).forEach(([fieldName, config]) => {
    if (config.dependent) {
      const dependentField = config.dependent.field
      if (!dependencies[dependentField]) {
        dependencies[dependentField] = []
      }
      dependencies[dependentField].push(fieldName)
    }

    if (config.invalidates) {
      invalidations[fieldName] = config.invalidates
    }
  })

  return { dependencies, invalidations }
}

export function formatZodErrors(error: z.ZodError): Record<string, { type: string; message: string }> {
  const { fieldErrors } = error.flatten()
  const formatted: Record<string, { type: string; message: string }> = {}

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (messages && Array.isArray(messages) && messages.length > 0) {
      formatted[field] = {
        type: 'validation',
        message: messages[0] as string,
      }
    }
  })

  return formatted
}
