# HMPO Form Wizard Migration Strategy

## Executive Summary

This document provides a comprehensive strategy for migrating away from the `hmpo-form-wizard` library to modern, decoupled alternatives. The approach uses the Strangler Fig Pattern to enable incremental migration with minimal risk and disruption.

## Why Migrate?

- **Tight Coupling**: The wizard tightly couples routing, validation, state management, and business logic
- **Legacy Patterns**: Uses older patterns that are harder to test and maintain
- **Limited Flexibility**: Declarative configuration limits customization options
- **Dependency Lock-in**: Deep integration makes it difficult to adopt modern tools
- **Testing Challenges**: Controller lifecycle complexity makes unit testing difficult

## Core Features to Replace

### 1. Multi-Step Form Routing
**Current**: Declarative step definitions with automatic route handling
**Modern Alternative**: Express Router with explicit route handlers

### 2. Field Validation
**Current**: Built-in validation with string-based rules
**Modern Alternatives**: 
- **Zod** (recommended): Schema-based validation with TypeScript support
- **Joi**: Mature validation library
- **Yup**: Similar to Joi with smaller footprint

### 3. Session Management
**Current**: `req.sessionModel` and `req.journeyModel`
**Modern Alternative**: Direct `express-session` with custom middleware

### 4. CSRF Protection
**Current**: Built-in using deprecated `csrf` package
**Modern Alternatives**:
- **@dr.pogodin/csurf**: Drop-in replacement for deprecated csurf
- **csrf-csrf**: Double Submit Cookie Pattern (stateless)
- **csrf-sync**: Synchronizer Token Pattern (session-based)

### 5. Template Rendering
**Current**: Integrated with template path resolution
**Modern Alternative**: Direct template engine usage (Nunjucks, Pug, etc.)

## Migration Strategy: The Strangler Fig Pattern

### Phase 1: Foundation Setup (1-2 weeks)

#### 1.0 Automated Migration Analysis

```javascript
// scripts/analyze-wizard.js
const fs = require('fs');
const path = require('path');

// Analyze existing HMPO configuration for migration readiness
function analyzeWizard(stepsPath, fieldsPath) {
  const steps = require(stepsPath);
  const fields = require(fieldsPath);
  
  const analysis = {
    totalSteps: Object.keys(steps).length,
    totalFields: Object.keys(fields).length,
    complexity: {
      customControllers: 0,
      conditionalRouting: 0,
      dependencies: 0,
      invalidations: 0,
      asyncValidators: 0
    },
    migrationOrder: []
  };
  
  // Analyze step complexity
  Object.entries(steps).forEach(([path, config]) => {
    let complexity = 0;
    
    if (config.controller && config.controller !== 'Controller') {
      analysis.complexity.customControllers++;
      complexity += 3;
    }
    
    if (Array.isArray(config.next)) {
      analysis.complexity.conditionalRouting++;
      complexity += 2;
    }
    
    // Check field dependencies
    const stepFields = config.fields || [];
    stepFields.forEach(fieldName => {
      const field = fields[fieldName];
      if (field?.dependent) {
        analysis.complexity.dependencies++;
        complexity += 2;
      }
      if (field?.invalidates) {
        analysis.complexity.invalidations++;
        complexity += 1;
      }
    });
    
    analysis.migrationOrder.push({
      path,
      complexity,
      fields: stepFields
    });
  });
  
  // Sort by complexity (migrate simpler steps first)
  analysis.migrationOrder.sort((a, b) => a.complexity - b.complexity);
  
  return analysis;
}

// Generate migration plan
const analysis = analyzeWizard('./steps.js', './fields.js');
console.log('Migration Analysis:', JSON.stringify(analysis, null, 2));

// Output recommended migration order
console.log('\nRecommended Migration Order:');
analysis.migrationOrder.forEach((step, index) => {
  console.log(`${index + 1}. ${step.path} (complexity: ${step.complexity})`);
});
```

#### 1.1 Create Migration Infrastructure

```javascript
// utils/journey-resolver.js
const steps = require('../config/steps'); // Your existing steps config

function resolveNextStep(currentPath, formData) {
  const stepConfig = steps[currentPath];
  if (!stepConfig) return '/error';
  
  if (typeof stepConfig.next === 'string') {
    return stepConfig.next;
  }
  
  if (Array.isArray(stepConfig.next)) {
    for (const rule of stepConfig.next) {
      if (typeof rule === 'string') {
        return rule; // Default case
      }
      
      // Handle conditional routing
      if (rule.field) {
        const fieldValue = formData[rule.field];
        const op = rule.op || '===';
        
        if (evaluateCondition(fieldValue, op, rule.value)) {
          return typeof rule.next === 'function' 
            ? rule.next(formData) 
            : rule.next;
        }
      }
      
      // Handle function-based conditions
      if (rule.fn && rule.fn(formData)) {
        return rule.next;
      }
    }
  }
  
  return '/error';
}

function evaluateCondition(fieldValue, op, expectedValue) {
  switch(op) {
    case '===':
    case '==':
    case '=':
      return fieldValue === expectedValue;
    case '<':
      return fieldValue < expectedValue;
    case '>':
      return fieldValue > expectedValue;
    case '<=':
      return fieldValue <= expectedValue;
    case '>=':
      return fieldValue >= expectedValue;
    case '!=':
    case '!==':
      return fieldValue !== expectedValue;
    default:
      if (typeof op === 'function') {
        return op(fieldValue, expectedValue);
      }
      return false;
  }
}

module.exports = { resolveNextStep };
```

#### 1.2 Set Up Modern Validation with Zod

```bash
npm install zod
```

```javascript
// schemas/migration-helpers.js
const { z } = require('zod');

// Create reusable schema builders that mirror HMPO validators
const validators = {
  // Mirror HMPO's 'required' validator
  required: (message = 'This field is required') => 
    z.string().min(1, { message }),
  
  // Mirror HMPO's string validators with formatting
  formattedString: (formatters = []) => {
    let schema = z.string();
    if (formatters.includes('trim')) {
      schema = schema.transform(val => val.trim());
    }
    if (formatters.includes('singlespaces')) {
      schema = schema.transform(val => val.replace(/\s+/g, ' '));
    }
    if (formatters.includes('uppercase')) {
      schema = schema.transform(val => val.toUpperCase());
    }
    return schema;
  },
  
  // Mirror HMPO's email validator
  email: () => z.string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  
  // Mirror HMPO's numeric validator with coercion
  numeric: () => z.coerce.number(),
  
  // Mirror HMPO's date validator
  dateString: () => z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine(val => !isNaN(new Date(val).getTime()), 'Invalid date')
};

// Migrate existing HMPO field configs to Zod schemas
function migrateFieldToZod(fieldConfig) {
  let schema = validators.formattedString(fieldConfig.formatter || []);
  
  if (fieldConfig.validate) {
    const rules = Array.isArray(fieldConfig.validate) 
      ? fieldConfig.validate 
      : [fieldConfig.validate];
    
    rules.forEach(rule => {
      if (rule === 'required') {
        schema = schema.min(1, 'This field is required');
      } else if (rule === 'email') {
        schema = z.string().email('Invalid email address');
      } else if (rule.type === 'minlength') {
        schema = schema.min(rule.arguments[0]);
      } else if (rule.type === 'maxlength') {
        schema = schema.max(rule.arguments[0]);
      }
    });
  }
  
  if (fieldConfig.default) {
    schema = schema.default(fieldConfig.default);
  }
  
  return schema;
}

module.exports = { validators, migrateFieldToZod };
```

#### 1.3 Initialize Clean Session State

```javascript
// middleware/session-state.js
function initializeFormState(req, res, next) {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  if (!req.session.journeyHistory) {
    req.session.journeyHistory = [];
  }
  if (!req.session.formErrors) {
    req.session.formErrors = {};
  }
  next();
}

module.exports = { initializeFormState };
```

### Phase 2: Incremental Step Migration (2-4 weeks per form)

#### 2.1 Migration Template for Each Step

Create a new file for each step following this pattern:

```javascript
// routes/migrated/[step-name].js
const { Router } = require('express');
const { z } = require('zod');
const { resolveNextStep } = require('../../utils/journey-resolver');
const { migrateFieldToZod } = require('../../schemas/migration-helpers');

const router = Router();

// Option 1: Direct migration from existing HMPO fields config
const existingFields = require('../fields'); // Your HMPO fields config
const stepFields = ['fieldName1', 'fieldName2']; // Fields for this step

// Auto-generate Zod schema from HMPO config
const stepSchema = z.object(
  stepFields.reduce((acc, fieldName) => {
    acc[fieldName] = migrateFieldToZod(existingFields[fieldName] || {});
    return acc;
  }, {})
);

// Option 2: Manual Zod schema (for complex validations)
const manualStepSchema = z.object({
  fieldName: z.string()
    .trim() // Replaces formatter
    .min(1, { message: 'Field is required' }) // Replaces 'required'
    .transform(val => val.replace(/\s+/g, ' ')), // Replaces 'singlespaces'
  
  // Handle dependent fields like HMPO
  dependentField: z.string().optional()
}).refine(
  // Implement HMPO's dependent field logic
  (data) => {
    if (data.fieldName === 'specificValue' && !data.dependentField) {
      return false;
    }
    return true;
  },
  {
    message: 'Dependent field is required when fieldName is specificValue',
    path: ['dependentField']
  }
);

// GET handler
router.get('/step-path', (req, res) => {
  const values = {
    ...req.session.formData,
    ...req.query // Support pre-population via query params
  };
  
  res.render('templates/step-name', {
    values,
    errors: req.session.formErrors || {},
    csrfToken: req.csrfToken && req.csrfToken() // If using CSRF protection
  });
  
  // Clear errors after rendering
  delete req.session.formErrors;
});

// POST handler
router.post('/step-path', async (req, res) => {
  try {
    // Zod handles formatting via transforms, no need for separate formatters
    const validationResult = await stepSchema.safeParseAsync(req.body);
    
    if (!validationResult.success) {
      // Convert Zod errors to HMPO-style error format for template compatibility
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      req.session.formErrors = Object.keys(fieldErrors).reduce((acc, key) => {
        // Take first error message for compatibility with existing templates
        acc[key] = { type: 'validation', message: fieldErrors[key][0] };
        return acc;
      }, {});
      
      // Preserve user input for re-display
      req.session.formValues = req.body;
      return res.redirect(req.originalUrl);
    }
    
    // Handle field invalidation (HMPO's invalidates feature)
    const previousData = req.session.formData || {};
    const invalidatedFields = checkInvalidations(previousData, validationResult.data);
    invalidatedFields.forEach(field => delete req.session.formData[field]);
    
    // Save validated and transformed data
    Object.assign(req.session.formData, validationResult.data);
    
    // Track journey history
    if (!req.session.journeyHistory.includes(req.path)) {
      req.session.journeyHistory.push(req.path);
    }
    
    // Determine next step
    const nextStep = resolveNextStep(req.path, req.session.formData);
    
    // Clear temporary form values
    delete req.session.formValues;
    
    // Redirect to next step
    res.redirect(nextStep);
    
  } catch (error) {
    console.error('Error processing form:', error);
    res.status(500).render('error', { error });
  }
});

// Helper to check field invalidations
function checkInvalidations(oldData, newData) {
  const invalidations = {
    'country': ['state', 'province'], // Define your invalidation rules
    'employmentStatus': ['employerName', 'salary']
  };
  
  const invalidated = [];
  Object.keys(invalidations).forEach(field => {
    if (oldData[field] !== newData[field]) {
      invalidated.push(...invalidations[field]);
    }
  });
  
  return invalidated;
}

module.exports = router;
```

#### 2.2 Wire in Migrated Steps

```javascript
// routes/form-wizard/index.js
const { Router } = require('express');
const wizard = require('hmpo-form-wizard');
const steps = require('./steps');
const fields = require('./fields');
const { initializeFormState } = require('../../middleware/session-state');

const router = Router();

// Initialize session state
router.use(initializeFormState);

// Mount migrated routes FIRST (they take precedence)
router.use(require('./migrated/step-one'));
router.use(require('./migrated/step-two'));
// Add more as you migrate them

// Legacy wizard handles remaining steps
router.use(wizard(steps, fields, {
  name: 'form-wizard',
  templatePath: 'templates'
}));

module.exports = router;
```

### Phase 3: Feature-Specific Migrations

#### 3.1 Field Dependencies and Invalidation with Zod

```javascript
// schemas/field-dependencies.js
const { z } = require('zod');

// Define dependencies matching HMPO's dependent and invalidates features
const fieldDependencies = {
  // HMPO's 'invalidates' feature
  invalidations: {
    'country': ['state', 'province', 'zipcode'],
    'employmentStatus': ['employerName', 'salary', 'employmentDetails']
  },
  
  // HMPO's 'dependent' feature as Zod schemas
  conditionalSchemas: {
    employment: z.object({
      employmentStatus: z.enum(['employed', 'self-employed', 'unemployed', 'retired']),
      employerName: z.string().optional(),
      salary: z.string().optional()
    }).refine(
      (data) => {
        // Employer name required if employed
        if (data.employmentStatus === 'employed' && !data.employerName) {
          return false;
        }
        return true;
      },
      {
        message: 'Employer name is required when employed',
        path: ['employerName']
      }
    ),
    
    address: z.object({
      country: z.string(),
      state: z.string().optional(),
      province: z.string().optional()
    }).refine(
      (data) => {
        // State required for US, province for Canada
        if (data.country === 'US' && !data.state) return false;
        if (data.country === 'CA' && !data.province) return false;
        return true;
      },
      {
        message: 'State/Province is required for selected country',
        path: ['state'] // Will show on state field
      }
    )
  }
};

// Helper to handle invalidations during migration
function processInvalidations(oldData, newData) {
  const invalidated = [];
  
  Object.keys(fieldDependencies.invalidations).forEach(field => {
    if (oldData[field] !== newData[field] && newData[field] !== undefined) {
      invalidated.push(...fieldDependencies.invalidations[field]);
    }
  });
  
  return invalidated;
}

// Create schema with HMPO-style dependencies
function createDependentSchema(fields, dependencies) {
  const baseSchema = z.object(fields);
  
  // Add refinements for each dependency
  return baseSchema.refine(
    (data) => {
      // Validate all dependencies
      for (const dep of dependencies) {
        if (dep.field && data[dep.field] !== dep.value) {
          continue; // Dependency not met, field not required
        }
        
        if (dep.targetField && !data[dep.targetField]) {
          return false; // Dependency met but target field missing
        }
      }
      return true;
    },
    {
      message: 'Dependent field validation failed',
      path: dependencies[0]?.targetField ? [dependencies[0].targetField] : []
    }
  );
}

module.exports = { fieldDependencies, processInvalidations, createDependentSchema };
```

#### 3.2 CSRF Protection Migration

```bash
npm install csrf-csrf
```

```javascript
// middleware/csrf.js
const { doubleCsrf } = require('csrf-csrf');

const { generateToken, validateRequest, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
});

module.exports = { generateToken, validateRequest, doubleCsrfProtection };
```

#### 3.3 Replace Formatters with Zod Transforms

```javascript
// schemas/zod-formatters.js
const { z } = require('zod');

// HMPO formatters as Zod transforms
const zodFormatters = {
  // Basic string formatters
  trim: () => z.string().transform(val => val.trim()),
  
  singlespaces: () => z.string().transform(val => val.replace(/\s+/g, ' ')),
  
  uppercase: () => z.string().transform(val => val.toUpperCase()),
  
  lowercase: () => z.string().transform(val => val.toLowerCase()),
  
  hyphens: () => z.string().transform(val => val.replace(/\s+/g, '-')),
  
  apostrophes: () => z.string().transform(val => val.replace(/['']/g, "'")),
  
  quotes: () => z.string().transform(val => val.replace(/[""]/g, '"')),
  
  // Chain multiple formatters
  chain: (...formatters) => {
    return formatters.reduce((schema, formatter) => {
      return formatter(schema);
    }, z.string());
  }
};

// Build schema with HMPO-style formatters
function buildFormattedSchema(formatterNames = []) {
  let schema = z.string();
  
  formatterNames.forEach(name => {
    switch(name) {
      case 'trim':
        schema = schema.transform(val => val.trim());
        break;
      case 'singlespaces':
        schema = schema.transform(val => val.replace(/\s+/g, ' '));
        break;
      case 'uppercase':
        schema = schema.transform(val => val.toUpperCase());
        break;
      case 'lowercase':
        schema = schema.transform(val => val.toLowerCase());
        break;
      case 'hyphens':
        schema = schema.transform(val => val.replace(/\s+/g, '-'));
        break;
      case 'apostrophes':
        schema = schema.transform(val => val.replace(/['']/g, "'"));
        break;
      case 'quotes':
        schema = schema.transform(val => val.replace(/[""]/g, '"'));
        break;
    }
  });
  
  return schema;
}

// Example: Migrate HMPO field with formatters to Zod
function migrateFormattedField(hmpoFieldConfig) {
  const formatters = hmpoFieldConfig.formatter || hmpoFieldConfig.formatters || [];
  let schema = buildFormattedSchema(formatters);
  
  // Add validation rules
  if (hmpoFieldConfig.validate) {
    const rules = Array.isArray(hmpoFieldConfig.validate) 
      ? hmpoFieldConfig.validate 
      : [hmpoFieldConfig.validate];
    
    rules.forEach(rule => {
      if (rule === 'required') {
        schema = schema.min(1, 'This field is required');
      }
      // Add other validation rules as needed
    });
  }
  
  return schema;
}

// Legacy formatter function for gradual migration
// Use this only during transition period
const legacyFormatters = {
  apply: (data, formatterNames) => {
    // This can be used as a fallback during migration
    // But prefer Zod transforms for new code
    console.warn('Using legacy formatters. Consider migrating to Zod transforms.');
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      let formatted = value;
      if (typeof formatted === 'string') {
        formatterNames.forEach(name => {
          switch(name) {
            case 'trim': formatted = formatted.trim(); break;
            case 'singlespaces': formatted = formatted.replace(/\s+/g, ' '); break;
            case 'uppercase': formatted = formatted.toUpperCase(); break;
            case 'lowercase': formatted = formatted.toLowerCase(); break;
            case 'hyphens': formatted = formatted.replace(/\s+/g, '-'); break;
          }
        });
      }
      result[key] = formatted;
    }
    return result;
  }
};

module.exports = { zodFormatters, buildFormattedSchema, migrateFormattedField, legacyFormatters };
```

### Phase 4: Testing Strategy

#### 4.1 End-to-End Tests (Keep existing)

```javascript
// test/e2e/journey.test.js
const request = require('supertest');
const app = require('../../app');

describe('Form Journey E2E', () => {
  it('should complete full journey', async () => {
    const agent = request.agent(app);
    
    // Step 1
    await agent
      .post('/form/step-1')
      .send({ name: 'John Doe' })
      .expect(302)
      .expect('Location', '/form/step-2');
    
    // Step 2
    await agent
      .post('/form/step-2')
      .send({ age: 25 })
      .expect(302)
      .expect('Location', '/form/step-3');
    
    // Verify session data
    const session = await agent
      .get('/debug/session')
      .expect(200);
    
    expect(session.body.formData).toMatchObject({
      name: 'John Doe',
      age: 25
    });
  });
});
```

#### 4.2 Unit Tests for Migrated Steps

```javascript
// test/unit/step-one.test.js
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const stepRouter = require('../../routes/migrated/step-one');

describe('Step One', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      secret: 'test',
      resave: false,
      saveUninitialized: true
    }));
    app.use(stepRouter);
  });
  
  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/step-one')
      .send({ name: '' })
      .expect(302);
    
    expect(res.header.location).toBe('/step-one');
  });
  
  it('should save valid data and redirect', async () => {
    const res = await request(app)
      .post('/step-one')
      .send({ name: 'John Doe' })
      .expect(302);
    
    expect(res.header.location).toBe('/step-two');
  });
});
```

### Phase 5: Decommissioning (1 week)

#### 5.1 Final Cleanup Checklist

- [ ] All steps migrated and tested
- [ ] Remove `hmpo-form-wizard` from package.json
- [ ] Remove legacy `steps.js` and `fields.js`
- [ ] Update journey resolver to use internal configuration
- [ ] Remove wizard middleware from routes
- [ ] Update documentation
- [ ] Performance testing completed
- [ ] Security audit completed

#### 5.2 Post-Migration Architecture

```
/routes
  /forms
    /user-registration
      index.js          # Main router
      /steps
        personal.js     # Personal details step
        contact.js      # Contact info step
        confirmation.js # Confirmation step
      /schemas
        validation.js   # Zod schemas
      /utils
        journey.js      # Journey logic
        formatters.js   # Field formatters
```

## Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Planning | 1 week | Analyze current implementation, identify dependencies |
| Foundation | 1-2 weeks | Set up infrastructure, utilities, and patterns |
| Step Migration | 2-4 weeks | Migrate steps incrementally (varies by form complexity) |
| Testing | 1 week | Comprehensive testing of migrated forms |
| Decommissioning | 1 week | Remove old dependencies, cleanup |

## Risk Mitigation

1. **Data Loss**: Implement session backup/restore during migration
2. **User Disruption**: Use feature flags to control rollout
3. **Validation Gaps**: Create comprehensive test suites before migration
4. **Performance**: Monitor response times and session storage
5. **Security**: Audit CSRF protection and session management

## Benefits After Migration

- **Type Safety with Zod**: Full TypeScript inference for form data and validation
- **Testability**: Each step can be unit tested in isolation with schema validation
- **Flexibility**: Easy to customize individual steps and compose schemas
- **Maintainability**: Clear, explicit code flow with declarative schemas
- **Modern Stack**: Zod's zero dependencies vs HMPO's multiple dependencies
- **Performance**: Reduced overhead from wizard framework, faster validation
- **Developer Experience**: Better error messages, schema composition, and IDE support
- **Transform Pipeline**: Replace separate formatters with Zod's transform chain
- **Async Validation**: Native async support with `safeParseAsync`
- **Schema Reuse**: Define once, use for validation, TypeScript types, and documentation

## Common Pitfalls to Avoid

1. **Migrating too many steps at once**: Stick to one step at a time
2. **Forgetting journey history**: Maintain compatibility during migration
3. **Skipping tests**: Test each migrated step thoroughly
4. **Ignoring edge cases**: Handle all branching logic scenarios
5. **Breaking sessions**: Ensure session compatibility between old and new
6. **Formatter vs Transform confusion**: Remember Zod transforms replace HMPO formatters
7. **Async validation oversight**: Use `safeParseAsync` for async refinements
8. **Error format mismatch**: Convert Zod errors to HMPO format for template compatibility
9. **Missing field dependencies**: Implement HMPO's dependent/invalidates with Zod refinements
10. **Schema duplication**: Create reusable schema components instead of duplicating

## Conclusion

This migration strategy provides a low-risk path to modernize your form handling while maintaining functionality. The incremental approach ensures business continuity while gradually improving the codebase. The resulting architecture will be more maintainable, testable, and aligned with modern JavaScript practices.