/* eslint-disable @typescript-eslint/no-explicit-any, no-continue, global-require, @typescript-eslint/no-require-imports */
import type { Request } from 'express'

// Use require to avoid TypeScript import issues with the steps config
const steps = require('../routes/recall/steps') as Record<string, any>

type StepConfig = {
  next?: string | Array<string | { fn: string | ((req: Request) => boolean); next: string }>
  fields?: string[]
  template?: string
  controller?: unknown
  entryPoint?: boolean
  reset?: boolean
  resetJourney?: boolean
  skip?: boolean
  editable?: boolean
  checkJourney?: boolean
}

export function resolveNextStep(currentPath: string, formData: Record<string, unknown>, req?: Request): string {
  const stepConfig = steps[currentPath] as StepConfig
  if (!stepConfig) return '/error'

  // Handle simple string next
  if (typeof stepConfig.next === 'string') {
    return stepConfig.next
  }

  // Handle array of next conditions
  if (Array.isArray(stepConfig.next)) {
    for (const rule of stepConfig.next) {
      // Simple string fallback
      if (typeof rule === 'string') {
        return rule
      }

      // Function-based condition
      if (typeof rule === 'object' && rule.fn) {
        let shouldNavigate = false

        // Handle string function names (method on controller)
        if (typeof rule.fn === 'string') {
          // This would need to be resolved from the controller
          // For now, we'll skip string function names

          continue
        }

        // Handle function conditions
        if (typeof rule.fn === 'function') {
          // Create a mock req object with sessionModel if needed
          const mockReq =
            req ||
            ({
              sessionModel: {
                get: (key: string) => formData[key],
                attributes: formData,
              },
              session: {
                formData,
              },
            } as any)

          shouldNavigate = rule.fn(mockReq)
        }

        if (shouldNavigate) {
          return rule.next
        }
      }
    }
  }

  // No next step defined or no conditions met
  return '/error'
}

export function getPreviousStep(currentPath: string, journeyHistory: string[]): string | null {
  const currentIndex = journeyHistory.indexOf(currentPath)
  if (currentIndex > 0) {
    return journeyHistory[currentIndex - 1]
  }
  return null
}

export function getStepFields(stepPath: string): string[] {
  const stepConfig = steps[stepPath] as StepConfig
  return stepConfig?.fields || []
}

export function isEditableStep(stepPath: string): boolean {
  const stepConfig = steps[stepPath] as StepConfig
  return stepConfig?.editable !== false
}

export function shouldCheckJourney(stepPath: string): boolean {
  const stepConfig = steps[stepPath] as StepConfig
  return stepConfig?.checkJourney !== false
}

export function isEntryPoint(stepPath: string): boolean {
  const stepConfig = steps[stepPath] as StepConfig
  return stepConfig?.entryPoint === true
}

export function shouldResetJourney(stepPath: string): boolean {
  const stepConfig = steps[stepPath] as StepConfig
  return stepConfig?.reset === true || stepConfig?.resetJourney === true
}
