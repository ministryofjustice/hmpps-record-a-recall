# HMPO Form Wizard to Zod - Detailed Migration Plan

## Executive Summary

This document provides a comprehensive, step-by-step implementation plan for migrating the HMPPS Record a Recall application from `hmpo-form-wizard` to Zod validation using the Strangler Fig Pattern. The migration will be incremental, with each step being a small, reviewable commit that maintains full functionality.

## Current State Analysis

### Forms Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Structure                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Search Form (Simple)                                      │
│    └── 2 steps, basic validation                            │
│                                                              │
│ 2. Edit Recall Form (Moderate)                              │
│    └── 11 steps, reuses main form controllers               │
│                                                              │
│ 3. Main Recall Form (Complex)                               │
│    └── 23 steps, 16 custom controllers                      │
│        └── Complex conditional routing                      │
│        └── Field dependencies & invalidations               │
│        └── Dynamic field generation                         │
└─────────────────────────────────────────────────────────────┘
```

### Migration Order (Complexity-Based)

```
Simple → Moderate → Complex
   ↓        ↓         ↓
Search → Edit → Main Recall
```

## Phase-by-Phase Implementation

### Phase 1: Foundation Infrastructure

#### TODO 1.1: Create Zod Migration Utilities
**Files to create:**
- `server/migration/zod-helpers.ts`

**Implementation:**
```typescript
import { z } from 'zod'
import type { FieldConfig } from 'hmpo-form-wizard'

export function migrateFieldToZod(fieldConfig: FieldConfig): z.ZodSchema {
  let schema: z.ZodSchema = z.string()
  
  // Handle formatters
  const formatters = fieldConfig.formatter || []
  if (formatters.includes('trim')) {
    schema = schema.transform(val => val.trim())
  }
  if (formatters.includes('singlespaces')) {
    schema = schema.transform(val => val.replace(/\s+/g, ' '))
  }
  
  // Handle validators
  const validators = Array.isArray(fieldConfig.validate) 
    ? fieldConfig.validate 
    : [fieldConfig.validate].filter(Boolean)
  
  validators.forEach(validator => {
    if (validator === 'required') {
      schema = z.string().min(1, 'This field is required')
    }
    // Add more validator conversions
  })
  
  return schema
}

export function createFieldDependencies(fields: Record<string, FieldConfig>) {
  // Implementation for field dependencies
}
```

**Test:**
```bash
npm test server/migration/__tests__/zod-helpers.test.ts
```

**Commit message:**
```
feat(migration): add Zod schema migration utilities for HMPO fields

- Create helper to convert HMPO field configs to Zod schemas
- Support formatters and validators
- Add field dependency logic
```

#### TODO 1.2: Create Session Management Wrapper
**Files to create:**
- `server/migration/session-wrapper.ts`

**Implementation:**
```typescript
export class SessionWrapper {
  constructor(private req: any) {}
  
  getFormData() {
    return this.req.session.formData || {}
  }
  
  setFormData(data: Record<string, any>) {
    this.req.session.formData = { ...this.req.session.formData, ...data }
  }
  
  getErrors() {
    return this.req.session.formErrors || {}
  }
  
  setErrors(errors: Record<string, any>) {
    this.req.session.formErrors = errors
  }
  
  clearErrors() {
    delete this.req.session.formErrors
  }
}
```

**Commit message:**
```
feat(migration): add session management abstraction layer

- Create SessionWrapper for consistent session handling
- Abstract HMPO session model functionality
- Prepare for gradual migration from req.sessionModel
```

#### TODO 1.3: Create Journey Resolver
**Files to create:**
- `server/migration/journey-resolver.ts`

**Implementation:**
```typescript
import steps from '../routes/recall/steps'

export function resolveNextStep(
  currentPath: string,
  formData: Record<string, any>
): string {
  const stepConfig = steps[currentPath]
  if (!stepConfig) return '/error'
  
  if (typeof stepConfig.next === 'string') {
    return stepConfig.next
  }
  
  if (Array.isArray(stepConfig.next)) {
    for (const rule of stepConfig.next) {
      if (typeof rule === 'string') return rule
      
      if (rule.fn && rule.fn({ sessionModel: { get: (key: string) => formData[key] } })) {
        return rule.next
      }
    }
  }
  
  return '/error'
}
```

**Commit message:**
```
feat(migration): add journey navigation resolver

- Extract routing logic from HMPO wizard
- Support conditional navigation rules
- Enable progressive migration of routing
```

#### TODO 1.4: Create Validation Middleware
**Files to create:**
- `server/migration/validation-middleware.ts`

**Implementation:**
```typescript
import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validateWithZod(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.safeParseAsync(req.body)
      
      if (!result.success) {
        const errors = formatZodErrors(result.error)
        req.session.formErrors = errors
        req.session.formValues = req.body
        return res.redirect(req.originalUrl)
      }
      
      req.validatedData = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

function formatZodErrors(error: z.ZodError) {
  // Convert Zod errors to HMPO format
}
```

**Commit message:**
```
feat(migration): add Zod validation middleware

- Create Express middleware for Zod validation
- Convert Zod errors to HMPO-compatible format
- Preserve form values on validation failure
```

### Phase 2: Search Form Migration (Simplest)

#### TODO 2.1: Create Search Schema
**Files to create:**
- `server/schemas/search.schema.ts`

**Implementation:**
```typescript
import { z } from 'zod'

export const searchSchema = z.object({
  nomisId: z.string()
    .min(1, 'Enter a NOMIS ID')
    .max(7, 'NOMIS ID must be 7 characters or less')
    .transform(val => val.trim().toUpperCase())
})

export type SearchData = z.infer<typeof searchSchema>
```

**Test:**
```typescript
// server/schemas/__tests__/search.schema.test.ts
describe('searchSchema', () => {
  it('validates required NOMIS ID', () => {
    const result = searchSchema.safeParse({ nomisId: '' })
    expect(result.success).toBe(false)
  })
  
  it('enforces max length', () => {
    const result = searchSchema.safeParse({ nomisId: '12345678' })
    expect(result.success).toBe(false)
  })
})
```

**Commit message:**
```
feat(migration): create Zod schema for search form

- Define searchSchema with NOMIS ID validation
- Add TypeScript type inference
- Include transforms for formatting
```

#### TODO 2.2: Create Migrated Search Route
**Files to create:**
- `server/routes/search/migrated/search-route.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import { searchSchema } from '../../../schemas/search.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import PersonSearchController from '../../../controllers/search/personSearchController'

const router = Router()

router.get('/nomisId', (req, res) => {
  res.render('search', {
    values: req.session.formData || {},
    errors: req.session.formErrors || {}
  })
  delete req.session.formErrors
})

router.post('/nomisId', 
  validateWithZod(searchSchema),
  async (req, res) => {
    const validatedData = req.validatedData as { nomisId: string }
    const nomisId = validatedData.nomisId
    
    // IMPORTANT: Don't use req.sessionModel - it doesn't exist outside HMPO
    // Use standard Express session instead:
    if (!req.session.formData) {
      req.session.formData = {}
    }
    req.session.formData.nomisId = nomisId
    
    res.redirect(`/person/${nomisId}`)
  }
)

export default router
```

**Commit message:**
```
feat(migration): create Zod-based search route

- Implement search route with Zod validation
- Preserve existing controller logic
- Mount alongside HMPO route for testing
```

#### TODO 2.3: Wire Migrated Search Route
**Files to modify:**
- `server/routes/search/index.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import wizard from 'hmpo-form-wizard'
import steps from './steps'
import fields from './fields'

const router = Router()

// Feature flag for gradual rollout
if (process.env.USE_MIGRATED_SEARCH === 'true') {
  router.use(require('./migrated/search-route'))
} else {
  router.use(wizard(steps, fields))
}

export default router
```

**Commit message:**
```
feat(migration): add feature flag for search migration

- Enable A/B testing with environment variable
- Allow gradual rollout of migrated search
- Maintain backward compatibility
```

### Phase 3: Core Recall Schemas

#### TODO 3.1: Create Date Validation Schemas
**Files to create:**
- `server/schemas/recall/dates.schema.ts`

**Implementation:**
```typescript
import { z } from 'zod'
import { parse, startOfToday, isEqual, isBefore } from 'date-fns'

const dateTodayOrInPastRefinement = (val: string) => {
  if (!val) return true
  const date = parse(val, 'yyyy-MM-dd', new Date())
  const today = startOfToday()
  return isEqual(date, today) || isBefore(date, today)
}

export const revocationDateSchema = z.object({
  revocationDate: z.string()
    .min(1, 'Enter the date of revocation')
    .refine(dateTodayOrInPastRefinement, 'Date must be today or in the past')
})

export const rtcDateSchema = z.object({
  inPrisonAtRecall: z.enum(['true', 'false']),
  returnToCustodyDate: z.string().optional()
}).refine(
  data => data.inPrisonAtRecall === 'true' || !!data.returnToCustodyDate,
  {
    message: 'Enter the date they were arrested',
    path: ['returnToCustodyDate']
  }
)
```

**Commit message:**
```
feat(migration): create date validation schemas

- Implement revocationDate schema with past date validation
- Create conditional rtcDate schema
- Port custom date validators to Zod
```

#### TODO 3.2: Create Choice Field Schemas
**Files to create:**
- `server/schemas/recall/choices.schema.ts`

**Implementation:**
```typescript
import { z } from 'zod'

export const recallTypeSchema = z.object({
  recallType: z.string().min(1, 'Select the type of recall')
})

export const confirmCancelSchema = z.object({
  confirmCancel: z.enum(['true', 'false'])
})

export const activeSentenceChoiceSchema = z.object({
  activeSentenceChoice: z.string()
    .min(1, 'Select whether this case had an active sentence')
})
```

**Commit message:**
```
feat(migration): create choice field schemas

- Define schemas for radio button fields
- Add validation messages
- Support dynamic options
```

### Phase 4: Simple Step Migration

#### TODO 4.1: Migrate Not Possible Step
**Files to create:**
- `server/routes/recall/migrated/not-possible.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import NotPossibleController from '../../../controllers/recall/notPossibleController'

const router = Router()

router.get('/not-possible', (req, res) => {
  const controller = new NotPossibleController()
  // Reuse existing controller logic
  controller.get(req, res)
})

export default router
```

**Commit message:**
```
feat(migration): migrate not-possible step

- Create standalone route for not-possible page
- Preserve existing controller logic
- Remove HMPO dependencies
```

#### TODO 4.2: Migrate Confirm Cancel Step
**Files to create:**
- `server/routes/recall/migrated/confirm-cancel.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import { confirmCancelSchema } from '../../../schemas/recall/choices.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import ConfirmCancelController from '../../../controllers/recall/confirmCancelController'

const router = Router()

router.get('/confirm-cancel', (req, res) => {
  res.render('base-question', {
    // Template data
  })
})

router.post('/confirm-cancel',
  validateWithZod(confirmCancelSchema),
  (req, res) => {
    if (req.validatedData.confirmCancel === 'true') {
      // Clear session and redirect
      req.session.destroy()
      res.redirect('/')
    } else {
      // Return to recall
      res.redirect('back')
    }
  }
)

export default router
```

**Commit message:**
```
feat(migration): migrate confirm-cancel step

- Implement cancel confirmation with Zod
- Handle session cleanup
- Preserve navigation logic
```

### Phase 5: Date Input Steps

#### TODO 5.1: Migrate Revocation Date Step
**Files to create:**
- `server/routes/recall/migrated/revocation-date.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import { revocationDateSchema } from '../../../schemas/recall/dates.schema'
import { validateWithZod } from '../../../migration/validation-middleware'
import { resolveNextStep } from '../../../migration/journey-resolver'

const router = Router()

router.get('/revocation-date', (req, res) => {
  res.render('base-question', {
    fields: {
      revocationDate: {
        component: 'govukDateInput',
        // Field config
      }
    },
    values: req.session.formData,
    errors: req.session.formErrors
  })
})

router.post('/revocation-date',
  validateWithZod(revocationDateSchema),
  (req, res) => {
    req.session.formData = {
      ...req.session.formData,
      ...req.validatedData
    }
    const nextStep = resolveNextStep('/revocation-date', req.session.formData)
    res.redirect(nextStep)
  }
)

export default router
```

**Commit message:**
```
feat(migration): migrate revocation-date step

- Implement date input with Zod validation
- Use journey resolver for navigation
- Preserve session data handling
```

### Phase 6: Complex Business Logic Steps

#### TODO 6.1: Migrate Check Sentences Step
**Files to create:**
- `server/routes/recall/migrated/check-sentences.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import CheckSentencesController from '../../../controllers/recall/checkSentencesController'
import { getEligibleSentenceCount } from '../../../helpers/formWizardHelper'

const router = Router()

router.get('/check-sentences', async (req, res) => {
  // Complex controller logic extraction
  const controller = new CheckSentencesController()
  const locals = await controller.locals(req, res)
  
  res.render('check-sentences', locals)
})

router.post('/check-sentences', (req, res) => {
  // Handle sentence checking logic
  const nextStep = resolveNextStep('/check-sentences', req.session.formData)
  res.redirect(nextStep)
})

export default router
```

**Commit message:**
```
feat(migration): migrate check-sentences step

- Extract complex sentence validation logic
- Preserve eligibility checking
- Maintain controller functionality
```

### Phase 7: Edit Form Migration

#### TODO 7.1: Migrate Populate Stored Recall
**Files to create:**
- `server/routes/recall/edit/migrated/populate-stored-recall.ts`

**Implementation:**
```typescript
import { Router } from 'express'
import PopulateStoredRecallController from '../../../../controllers/recall/edit/populateStoredRecallController'

const router = Router()

router.get('/populate-stored-recall', async (req, res, next) => {
  const controller = new PopulateStoredRecallController()
  await controller.populateFromStored(req, res)
  res.redirect('/edit-summary')
})

export default router
```

**Commit message:**
```
feat(migration): migrate populate-stored-recall step

- Load existing recall data into session
- Preserve data population logic
- Support edit workflow
```

### Phase 8: Testing Strategy

#### TODO 8.1: Create Schema Test Suite
**Files to create:**
- `server/schemas/__tests__/recall/dates.schema.test.ts`

**Implementation:**
```typescript
import { revocationDateSchema, rtcDateSchema } from '../../recall/dates.schema'

describe('Date Schemas', () => {
  describe('revocationDateSchema', () => {
    it('accepts valid past date', () => {
      const result = revocationDateSchema.safeParse({
        revocationDate: '2023-01-01'
      })
      expect(result.success).toBe(true)
    })
    
    it('rejects future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const result = revocationDateSchema.safeParse({
        revocationDate: futureDate.toISOString().split('T')[0]
      })
      expect(result.success).toBe(false)
    })
  })
})
```

**Commit message:**
```
test(migration): add comprehensive schema tests

- Test date validation logic
- Verify conditional field behavior
- Ensure error messages are correct
```

#### TODO 8.2: Create Integration Tests
**Files to create:**
- `integration_tests/migration/recall-journey.test.ts`

**Implementation:**
```typescript
import request from 'supertest'
import app from '../../server/app'

describe('Migrated Recall Journey', () => {
  it('completes full recall journey', async () => {
    const agent = request.agent(app)
    
    // Step through entire journey
    await agent.post('/revocation-date')
      .send({ revocationDate: '2024-01-01' })
      .expect(302)
    
    // Verify session data
    const session = await agent.get('/debug/session')
    expect(session.body.formData.revocationDate).toBe('2024-01-01')
  })
})
```

**Commit message:**
```
test(migration): add end-to-end journey tests

- Test complete form workflows
- Verify session persistence
- Ensure navigation logic works
```

### Phase 9: Cleanup and Decommissioning

#### TODO 9.1: Remove HMPO Dependencies
**Files to modify:**
- `package.json`
- All route files

**Commands:**
```bash
npm uninstall hmpo-form-wizard
rm server/routes/recall/steps.ts
rm server/routes/recall/fields.ts
rm server/routes/recall/edit/steps.ts
rm server/routes/recall/edit/fields.ts
```

**Commit message:**
```
feat(migration): remove HMPO Form Wizard

- Uninstall hmpo-form-wizard package
- Remove legacy step and field configs
- Complete migration to Zod
```

#### TODO 9.2: Final Code Organization
**Structure:**
```
server/
├── routes/
│   ├── recall/
│   │   ├── index.ts
│   │   ├── revocation-date.ts
│   │   ├── rtc-date.ts
│   │   └── ...
│   └── search/
│       └── index.ts
├── schemas/
│   ├── recall/
│   │   ├── dates.schema.ts
│   │   ├── choices.schema.ts
│   │   └── complex.schema.ts
│   └── search.schema.ts
├── validation/
│   ├── middleware.ts
│   └── formatters.ts
└── journey/
    └── resolver.ts
```

**Commit message:**
```
refactor(migration): finalize code organization

- Move migrated routes to permanent locations
- Organize schemas by domain
- Clean up migration utilities
```

## Verification Checklist

### Per-Step Verification
- [ ] Existing tests pass
- [ ] Form renders correctly
- [ ] Validation works as expected
- [ ] Navigation to next step works
- [ ] Session data is preserved
- [ ] Error messages display correctly

### End-to-End Verification
- [ ] Complete recall journey works
- [ ] Edit recall journey works
- [ ] Search functionality works
- [ ] All conditional routing works
- [ ] Field dependencies work
- [ ] Performance metrics acceptable

## Common Migration Pitfalls & Solutions

### 1. SessionModel vs Standard Session
**Problem**: HMPO uses `req.sessionModel` and `req.journeyModel` which don't exist in standard Express.

**❌ Wrong (HMPO style):**
```typescript
req.sessionModel.set('nomisId', nomisId)
const value = req.sessionModel.get('nomisId')
req.journeyModel.reset()
```

**✅ Correct (Express session):**
```typescript
// Initialize if needed
if (!req.session.formData) {
  req.session.formData = {}
}

// Set values
req.session.formData.nomisId = nomisId

// Get values  
const value = req.session.formData.nomisId

// Reset journey
delete req.session.formData
delete req.session.formErrors
delete req.session.formValues
```

### 2. Missing Root Path Handler
**Problem**: HMPO wizard handles root path (`/`) automatically, but migrated routes need explicit handling.

**Solution**: Add a root handler that mimics HMPO behavior:
```typescript
router.get('/', (req, res) => {
  // Reset session (matches entryPoint: true, reset: true)
  delete req.session.formData
  delete req.session.formErrors
  
  // Redirect to first step (matches skip: true, next: 'stepName')
  res.redirect('/form/first-step')
})
```

### 3. Controller Lifecycle Methods
**Problem**: HMPO controllers have specific lifecycle methods that aren't available in plain Express.

**Migration mapping:**
- `locals()` → Move logic to route handler before render
- `validateFields()` → Use Zod validation middleware
- `successHandler()` → Put logic after validation in POST handler
- `saveValues()` → Store in `req.session.formData` after validation

### 4. Flash Messages
**Problem**: Flash message implementation differs between HMPO and standard Express.

**Solution**: Ensure flash middleware is properly configured and use standard pattern:
```typescript
const errorMessage = req.flash('errorMessage')
res.render('template', { errorMessage })
```

### 5. TypeScript Types
**Problem**: TypeScript doesn't know about session extensions.

**Solution**: Extend Express session types in `@types/express/index.d.ts`:
```typescript
declare module 'express-session' {
  interface SessionData {
    formErrors?: Record<string, { type: string; message: string }>
    formValues?: Record<string, unknown>
    formData?: Record<string, unknown>
  }
}
```

## Rollback Strategy

Each step can be rolled back by:
1. Reverting the commit
2. Toggling feature flag
3. Re-deploying previous version

## Benefits After Migration

1. **Type Safety**: Full TypeScript inference from Zod schemas
2. **Testability**: Each schema and route independently testable
3. **Maintainability**: Clear, explicit validation logic
4. **Performance**: Reduced overhead from wizard framework
5. **Developer Experience**: Better IDE support and error messages
6. **Modern Stack**: Zero-dependency validation library

## Migration Progress Tracking

```
Phase 1: Foundation    [████████████████████] 100%
Phase 2: Search Form   [████████████████████] 100% ✓
Phase 3: Core Schemas  [                    ] 0%
Phase 4: Simple Steps  [                    ] 0%
Phase 5: Date Steps    [                    ] 0%
Phase 6: Complex Steps [                    ] 0%
Phase 7: Edit Form     [                    ] 0%
Phase 8: Testing       [                    ] 0%
Phase 9: Cleanup       [                    ] 0%
```

## Next Steps

1. Begin with Phase 1 foundation setup
2. Test each component in isolation
3. Deploy behind feature flags
4. Monitor and gather metrics
5. Gradually roll out to users
6. Complete cleanup once stable

---

This migration plan provides a systematic approach to modernizing the form handling while maintaining business continuity and allowing for incremental review and testing at each step.