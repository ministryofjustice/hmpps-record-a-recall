/**
 * Shared field type definitions
 * Extracted to prevent circular dependencies between controllers and helpers
 *
 * NOTE: Contains intentional 'any' types for backward compatibility
 * during migration from HMPO to Express + Zod
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Field {
  id?: string
  component?: string
  value?: any
  label?: { text: string }
  nameForErrors?: string
  errorMessages?: Record<string, string>
  items?: any[]
  name?: string
  prefix?: string
  attributes?: Record<string, any>
  skip?: boolean
  dependent?: {
    field: string
    value: any
  }
  [key: string]: any
}

export interface Fields {
  [fieldName: string]: Field
}

export type FieldEntry = [string, Field]
