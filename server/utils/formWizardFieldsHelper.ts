/**
 * Validation error structure from our validation middleware
 * Matches the errorSummary format used in populateValidationData
 */
interface ValidationError {
  href: string
  text: string
}

/**
 * Prepares FormWizard field configurations for template rendering during migration period.
 * TODO: Remove this helper once all forms are fully migrated from FormWizard
 *
 * This helper bridges the gap between:
 * - FormWizard field configurations (used by templates)
 * - Zod validation (used by new controllers)
 *
 * @param fieldConfigs - FormWizard field configuration objects
 * @param formValues - Current form values (from req.body or session)
 * @param validationErrors - Validation errors from Zod validation
 * @returns Fields object ready for template rendering with FormWizard macros
 */
export function prepareFormWizardFields(
  fieldConfigs: Record<string, unknown>,
  formValues?: Record<string, unknown>,
  validationErrors?: ValidationError[],
): Record<string, unknown> {
  const preparedFields: Record<string, unknown> = {}

  Object.entries(fieldConfigs).forEach(([fieldName, config]) => {
    // Clone config to avoid mutation
    const fieldOptions = { ...(config as Record<string, unknown>) }

    // Add current value if available
    if (formValues?.[fieldName] !== undefined) {
      fieldOptions.value = formValues[fieldName]
    }

    // Add error message if validation error exists for this field
    if (validationErrors?.length) {
      const error = validationErrors.find(err => err.href === `#${fieldName}`)
      if (error) {
        fieldOptions.errorMessage = {
          text: error.text,
        }
      }
    }

    preparedFields[fieldName] = fieldOptions
  })

  return preparedFields
}

/**
 * Helper to prepare a subset of fields for rendering
 * Useful when only specific fields from a larger field config need to be rendered
 *
 * @param fieldConfigs - Complete FormWizard field configuration
 * @param fieldNames - Array of field names to prepare
 * @param formValues - Current form values
 * @param validationErrors - Validation errors
 * @returns Subset of fields ready for template rendering
 */
export function prepareSelectedFormWizardFields(
  fieldConfigs: Record<string, unknown>,
  fieldNames: string[],
  formValues?: Record<string, unknown>,
  validationErrors?: ValidationError[],
): Record<string, unknown> {
  const selectedFields: Record<string, unknown> = {}

  fieldNames.forEach(fieldName => {
    if (fieldConfigs[fieldName]) {
      selectedFields[fieldName] = fieldConfigs[fieldName]
    }
  })

  return prepareFormWizardFields(selectedFields, formValues, validationErrors)
}
