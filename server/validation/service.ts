import { z, ZodSchema, ZodError } from 'zod'
import { Request } from 'express'
import { formatZodErrorsForView, FormattedErrors, hasErrors } from './utils/errorFormatting'
import type { SessionManager as SessionManagerType } from '../services/sessionManager'

// Import actual SessionManager - handle case where it might not exist yet
let SessionManager: typeof SessionManagerType
try {
  SessionManager = require('../services/sessionManager').default
} catch {
  // SessionManager not yet implemented - provide stub
  SessionManager = {
    getRecallData: (req: any) => req.session?.recallData || {},
    updateRecallData: (req: any, data: any) => {
      if (!req.session) req.session = {}
      req.session.recallData = { ...req.session.recallData, ...data }
    },
  } as any
}

/**
 * Registry of all step schemas
 * Will be populated as schemas are created
 */
const schemaRegistry: Record<string, ZodSchema> = {}

/**
 * Field label mappings for better error messages
 * Maps field names to human-readable labels
 */
const fieldLabels: Record<string, string> = {
  revocationDate: 'Recall date',
  returnToCustodyDate: 'Return to custody date',
  inPrisonAtRecall: 'Whether the person was in prison when the recall was made',
  recallType: 'Recall type',
  nomisId: 'NOMIS ID',
  confirmCancel: 'if you are sure you want to cancel recording a recall',
  courtCases: 'Court cases',
  sentenceType: 'Sentence type',
  sameSentenceType: 'Whether all sentences have the same type',
  activeSentenceChoice: 'Active sentence selection',
  manualRecallInterceptConfirmation: 'Manual recall confirmation',
}

/**
 * Validation result type
 */
export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: FormattedErrors
  rawError?: ZodError
}

/**
 * ValidationService provides centralized validation using Zod schemas
 * Integrates with SessionManager for seamless data flow
 */
export default class ValidationService {
  /**
   * Register a schema for a specific step
   */
  static registerSchema(stepName: string, schema: ZodSchema): void {
    schemaRegistry[stepName] = schema
  }

  /**
   * Get a registered schema by step name
   */
  static getSchemaForStep(stepName: string): ZodSchema | undefined {
    return schemaRegistry[stepName]
  }

  /**
   * Register field labels for better error messages
   */
  static registerFieldLabels(labels: Record<string, string>): void {
    Object.assign(fieldLabels, labels)
  }

  /**
   * Validate data against a step schema
   */
  static async validateStep(stepName: string, data: unknown): Promise<ValidationResult<any>> {
    const schema = schemaRegistry[stepName]
    if (!schema) {
      throw new Error(`No schema registered for step: ${stepName}`)
    }

    return this.validate(schema, data)
  }

  /**
   * Validate data against a provided schema
   */
  static async validate<T = any>(schema: ZodSchema<T>, data: unknown): Promise<ValidationResult<T>> {
    try {
      const result = await schema.parseAsync(data)
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrorsForView(error, fieldLabels)
        return {
          success: false,
          errors: formattedErrors,
          rawError: error,
        }
      }
      throw error
    }
  }

  /**
   * Validate request body against a step schema
   */
  static async validateRequest(req: Request, stepName: string): Promise<ValidationResult> {
    const schema = schemaRegistry[stepName]
    if (!schema) {
      throw new Error(`No schema registered for step: ${stepName}`)
    }

    // Pass the entire req.body for date parts processing
    return this.validate(schema, req.body)
  }

  /**
   * Merge validated data into session
   * Integrates with SessionManager
   */
  static mergeValidatedData(req: Request, validatedData: Record<string, any>): void {
    const currentData = SessionManager.getRecallData(req as any)
    SessionManager.updateRecallData(req as any, validatedData)
  }

  /**
   * Get validation errors from session
   */
  static getSessionErrors(req: Request): FormattedErrors | null {
    const session = req.session as any
    if (session.validationErrors) {
      return session.validationErrors
    }
    return null
  }

  /**
   * Store validation errors in session
   */
  static setSessionErrors(req: Request, errors: FormattedErrors | null): void {
    const session = req.session as any
    if (errors && hasErrors(errors)) {
      session.validationErrors = errors
      session.formValues = req.body // Store form values for re-population
    } else {
      delete session.validationErrors
      delete session.formValues
    }
  }

  /**
   * Clear validation errors from session
   */
  static clearSessionErrors(req: Request): void {
    const session = req.session as any
    delete session.validationErrors
    delete session.formValues
  }

  /**
   * Get form values from session (for re-populating after error)
   */
  static getSessionFormValues(req: Request): Record<string, any> {
    const session = req.session as any
    return session.formValues || {}
  }

  /**
   * Validate complete recall data
   * Combines all step schemas for final validation
   */
  static async validateFullRecall(data: unknown): Promise<ValidationResult> {
    // This will be implemented once we have all schemas
    // For now, return success
    return {
      success: true,
      data,
    }
  }

  /**
   * Create a composite schema from multiple step schemas
   * Useful for validating across multiple steps
   */
  static createCompositeSchema(stepNames: string[]): ZodSchema {
    const schemas = stepNames.map(name => {
      const schema = schemaRegistry[name]
      if (!schema) {
        throw new Error(`No schema registered for step: ${name}`)
      }
      return schema
    })

    // Merge all schemas into one
    return schemas.reduce((acc, schema) => {
      return z.intersection(acc, schema)
    }, z.object({}).passthrough())
  }

  /**
   * Perform conditional validation
   * Validates different schemas based on conditions
   */
  static async validateConditional<T = any>(
    data: unknown,
    conditions: Array<{ condition: (data: any) => boolean; schema: ZodSchema<T> }>,
  ): Promise<ValidationResult<T>> {
    for (const { condition, schema } of conditions) {
      if (condition(data)) {
        return this.validate(schema, data)
      }
    }

    // If no conditions match, validate with empty schema
    return this.validate(z.object({}).passthrough() as ZodSchema<T>, data)
  }

  /**
   * Helper to check if a specific field has errors
   */
  static fieldHasError(errors: FormattedErrors | null, fieldName: string): boolean {
    if (!errors) return false
    return fieldName in errors.errors
  }

  /**
   * Helper to get error message for a specific field
   */
  static getFieldError(errors: FormattedErrors | null, fieldName: string): string | null {
    if (!errors) return null
    return errors.errors[fieldName]?.text || null
  }

  /**
   * Transform data before validation
   * Useful for preprocessing form data
   */
  static transformFormData(data: Record<string, any>): Record<string, any> {
    const transformed = { ...data }

    // Convert string booleans to actual booleans where needed
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === 'true') transformed[key] = true
      if (transformed[key] === 'false') transformed[key] = false
    })

    return transformed
  }

  /**
   * Validate with business rules
   * Applies additional business logic after schema validation
   */
  static async validateWithBusinessRules<T = any>(
    schema: ZodSchema<T>,
    data: unknown,
    businessRules?: (validData: T) => Promise<FormattedErrors | null>,
  ): Promise<ValidationResult<T>> {
    // First validate with schema
    const schemaResult = await this.validate(schema, data)

    if (!schemaResult.success) {
      return schemaResult
    }

    // Then apply business rules if provided
    if (businessRules) {
      const businessErrors = await businessRules(schemaResult.data as T)
      if (businessErrors && hasErrors(businessErrors)) {
        return {
          success: false,
          data: schemaResult.data,
          errors: businessErrors,
        }
      }
    }

    return schemaResult
  }
}
