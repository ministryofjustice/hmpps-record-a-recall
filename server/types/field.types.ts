/**
 * Field type definitions for form rendering and validation
 * Used with GovUK Frontend components and conditional field logic
 */

// Field item for radio buttons, checkboxes, or date input parts
export interface FieldItem {
  value?: string | number | boolean
  text?: string
  label?: string
  id?: string
  name?: string
  classes?: string
  conditional?: string | string[] | Field | Field[]
  checked?: boolean
  selected?: boolean
  hint?: {
    text: string
  }
}

export interface Field {
  id?: string
  component?: string // e.g., 'govukDateInput', 'govukRadios', 'govukCheckboxes'
  value?: string | number | boolean | Date
  label?: {
    text: string
    classes?: string
  }
  nameForErrors?: string
  errorMessages?: Record<string, string>
  items?: FieldItem[]
  name?: string
  prefix?: string
  attributes?: Record<string, string> // HTML attributes like data-*
  dependent?: {
    field: string
    value: string | number | boolean | unknown // unknown for dynamic dependent values
  }
  hint?: {
    text: string
  }
  classes?: string
  fieldset?: {
    legend?: {
      text: string
      classes?: string
    }
  }
  // Allow additional properties for flexibility during rendering
  [key: string]: unknown
}

export interface Fields {
  [fieldName: string]: Field
}

export type FieldEntry = [string, Field]
