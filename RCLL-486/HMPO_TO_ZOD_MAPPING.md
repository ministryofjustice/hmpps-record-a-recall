# HMPO Form Wizard to Zod Concept Mapping Guide

This document provides a comprehensive mapping between hmpo-form-wizard validation concepts and their Zod equivalents, helping developers migrate from the declarative validation system to Zod's schema-based approach.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Basic Validators](#basic-validators)
- [String Validators](#string-validators)
- [Number Validators](#number-validators)
- [Date Validators](#date-validators)
- [Custom Validators](#custom-validators)
- [Field Dependencies](#field-dependencies)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)

## Core Concepts

### Field Definition Structure

**HMPO Form Wizard:**
```javascript
// fields.js
module.exports = {
  fieldName: {
    type: 'text',
    validate: 'required',
    default: 'defaultValue',
    formatter: ['trim', 'singlespaces']
  }
};
```

**Zod Equivalent:**
```javascript
// schemas.js
const schema = z.object({
  fieldName: z.string()
    .min(1, { message: 'Field is required' })
    .default('defaultValue')
    .transform(val => val.trim().replace(/\s+/g, ' '))
});
```

### Validation Approach

| Aspect | HMPO Form Wizard | Zod |
|--------|-----------------|-----|
| Definition | String-based rules in fields config | Schema objects with chained methods |
| Execution | During controller lifecycle | On-demand via parse/safeParse |
| Type Safety | No TypeScript support | Full TypeScript inference |
| Composability | Limited to predefined validators | Highly composable with refinements |
| Async Support | Built into controller | Via parseAsync/safeParseAsync |

## Basic Validators

### Required Field

**HMPO:**
```javascript
name: {
  validate: 'required'
}
```

**Zod:**
```javascript
name: z.string().min(1, { message: 'Name is required' })
// or for any non-empty value
name: z.string().nonempty('Name is required')
```

### Optional Field

**HMPO:**
```javascript
nickname: {
  // No 'required' validator means optional
}
```

**Zod:**
```javascript
nickname: z.string().optional()
// or with empty string handling
nickname: z.string().optional().or(z.literal(''))
```

### Default Values

**HMPO:**
```javascript
country: {
  default: 'UK'
}
```

**Zod:**
```javascript
country: z.string().default('UK')
// or with function
country: z.string().default(() => 'UK')
```

## String Validators

### String Length

**HMPO:**
```javascript
username: {
  validate: [
    'required',
    { type: 'minlength', arguments: [3] },
    { type: 'maxlength', arguments: [20] }
  ]
}
```

**Zod:**
```javascript
username: z.string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(20, { message: 'Username must be at most 20 characters' })
```

### Exact Length

**HMPO:**
```javascript
code: {
  validate: { type: 'exactlength', arguments: [6] }
}
```

**Zod:**
```javascript
code: z.string().length(6, { message: 'Code must be exactly 6 characters' })
```

### Email Validation

**HMPO:**
```javascript
email: {
  validate: 'email'
}
```

**Zod:**
```javascript
email: z.string().email({ message: 'Invalid email address' })
```

### Regex Patterns

**HMPO:**
```javascript
postcode: {
  validate: { type: 'regex', arguments: [/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i] }
}
```

**Zod:**
```javascript
postcode: z.string().regex(
  /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i,
  { message: 'Invalid postcode format' }
)
```

### Character Type Validators

**HMPO Alphanumeric Validators:**
```javascript
// HMPO has multiple variants
field1: { validate: 'alpha' },       // letters only
field2: { validate: 'alphanum' },    // letters and numbers
field3: { validate: 'alphaex' },     // letters with spaces and punctuation
field4: { validate: 'numeric' }      // numbers only
```

**Zod Equivalents:**
```javascript
// Letters only
field1: z.string().regex(/^[a-zA-Z]*$/, 'Letters only'),

// Letters and numbers
field2: z.string().regex(/^[a-zA-Z0-9]*$/, 'Alphanumeric only'),

// Letters with spaces and punctuation
field3: z.string().regex(/^[a-zA-Z .,'-]*$/, 'Invalid characters'),

// Numbers only (as string)
field4: z.string().regex(/^\d*$/, 'Numbers only')
// or convert to number
field4: z.coerce.number()
```

## Number Validators

### Numeric Fields

**HMPO:**
```javascript
age: {
  type: 'number',
  validate: ['required', 'numeric', 
    { type: 'range', fn: value => value >= 0 && value < 120 }
  ]
}
```

**Zod:**
```javascript
age: z.coerce.number()
  .int({ message: 'Age must be a whole number' })
  .min(0, { message: 'Age must be positive' })
  .max(119, { message: 'Age must be less than 120' })
```

### Phone Numbers

**HMPO:**
```javascript
phone: {
  validate: 'phonenumber'
},
ukMobile: {
  validate: 'ukmobilephone'
}
```

**Zod:**
```javascript
// General phone number
phone: z.string().regex(
  /^\(?\+?[\d()-]{0,15}$/,
  { message: 'Invalid phone number' }
),

// UK mobile
ukMobile: z.string().regex(
  /^(07)\d{9}$/,
  { message: 'Invalid UK mobile number' }
)
```

## Date Validators

### Date Formats

**HMPO:**
```javascript
birthDate: {
  validate: 'date'  // expects YYYY-MM-DD
}
```

**Zod:**
```javascript
// String date validation
birthDate: z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be YYYY-MM-DD'
).refine(val => {
  const date = new Date(val);
  return !isNaN(date.getTime());
}, 'Invalid date'),

// Or use coercion to Date object
birthDate: z.coerce.date()
```

### Date Components

**HMPO:**
```javascript
year: { validate: 'date-year' },
month: { validate: 'date-month' },
day: { validate: 'date-day' }
```

**Zod:**
```javascript
const dateComponentsSchema = z.object({
  year: z.coerce.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear()),
  
  month: z.coerce.number()
    .int()
    .min(1)
    .max(12),
  
  day: z.coerce.number()
    .int()
    .min(1)
    .max(31)
}).refine(data => {
  // Validate the complete date
  const date = new Date(data.year, data.month - 1, data.day);
  return date.getDate() === data.day;
}, { message: 'Invalid date' });
```

### Date Comparisons

**HMPO:**
```javascript
startDate: {
  validate: { type: 'before', arguments: ['2024-12-31'] }
},
endDate: {
  validate: { type: 'after', arguments: ['2024-01-01'] }
}
```

**Zod:**
```javascript
const dateRangeSchema = z.object({
  startDate: z.coerce.date()
    .max(new Date('2024-12-31'), { message: 'Must be before 2024-12-31' }),
  
  endDate: z.coerce.date()
    .min(new Date('2024-01-01'), { message: 'Must be after 2024-01-01' })
});
```

## Custom Validators

### Function-Based Validation

**HMPO:**
```javascript
customField: {
  validate: [
    { type: 'custom', fn: (value) => value.startsWith('PREFIX') }
  ]
}
```

**Zod:**
```javascript
customField: z.string().refine(
  val => val.startsWith('PREFIX'),
  { message: 'Must start with PREFIX' }
)
```

### Async Validation

**HMPO:**
```javascript
username: {
  validate: [
    { type: 'custom', fn: async (value) => {
      const exists = await checkUsernameExists(value);
      return !exists;
    }}
  ]
}
```

**Zod:**
```javascript
username: z.string().refine(
  async (val) => {
    const exists = await checkUsernameExists(val);
    return !exists;
  },
  { message: 'Username already taken' }
)
// Must use parseAsync/safeParseAsync for async refinements
```

## Field Dependencies

### Conditional Validation

**HMPO:**
```javascript
// In fields.js
employerName: {
  dependent: { field: 'employed', value: 'yes' },
  validate: 'required'
}
```

**Zod:**
```javascript
const schema = z.object({
  employed: z.enum(['yes', 'no']),
  employerName: z.string().optional()
}).refine(
  data => data.employed !== 'yes' || (data.employerName && data.employerName.length > 0),
  {
    message: 'Employer name is required when employed',
    path: ['employerName']
  }
);
```

### Field Invalidation

**HMPO:**
```javascript
country: {
  invalidates: ['state', 'province']
}
```

**Zod (with transform):**
```javascript
const schema = z.object({
  country: z.string(),
  state: z.string().optional(),
  province: z.string().optional()
}).transform((data) => {
  // Clear dependent fields when country changes
  if (data.country !== previousCountry) {
    data.state = undefined;
    data.province = undefined;
  }
  return data;
});
```

## Error Handling

### Error Messages

**HMPO:**
```javascript
// Errors are typically handled via i18n translations
// Error codes are returned and translated
```

**Zod:**
```javascript
// Inline error messages
z.string().min(1, { message: 'This field is required' })

// Or use error maps for centralized messages
const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `Must be at least ${issue.minimum} characters` };
    }
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(errorMap);
```

### Extracting Errors

**HMPO:**
```javascript
// Errors available in controller lifecycle
getErrors(req, res) {
  return req.form.errors;
}
```

**Zod:**
```javascript
const result = schema.safeParse(data);
if (!result.success) {
  // Flat field errors
  const fieldErrors = result.error.flatten().fieldErrors;
  // { fieldName: ["Error message 1", "Error message 2"] }
  
  // Or formatted errors
  const formattedErrors = result.error.format();
  // Nested structure matching schema shape
}
```

## Advanced Patterns

### Multiple Validation Rules

**HMPO:**
```javascript
password: {
  validate: [
    'required',
    { type: 'minlength', arguments: [8] },
    { type: 'regex', arguments: [/[A-Z]/] },
    { type: 'regex', arguments: [/[0-9]/] },
    { type: 'regex', arguments: [/[^A-Za-z0-9]/] }
  ]
}
```

**Zod:**
```javascript
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character')
```

### Formatting and Transformation

**HMPO:**
```javascript
name: {
  formatter: ['trim', 'singlespaces', 'uppercase']
}
```

**Zod:**
```javascript
name: z.string()
  .transform(val => val.trim())
  .transform(val => val.replace(/\s+/g, ' '))
  .transform(val => val.toUpperCase())
```

### Union Types (Multiple Valid Values)

**HMPO:**
```javascript
status: {
  validate: { type: 'equal', arguments: ['active', 'inactive', 'pending'] }
}
```

**Zod:**
```javascript
// Using enum
status: z.enum(['active', 'inactive', 'pending'])

// Or using union
status: z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('pending')
])
```

### Complex Object Validation

**HMPO:**
```javascript
// HMPO handles nested objects through flattened field names
'address.street': { validate: 'required' },
'address.city': { validate: 'required' },
'address.postcode': { validate: 'postcode' }
```

**Zod:**
```javascript
const addressSchema = z.object({
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    postcode: z.string().regex(/^[A-Z]{1,2}[0-9]/, 'Invalid postcode')
  })
});
```

## Migration Example

Here's a complete example migrating a typical HMPO form step to Zod:

### HMPO Configuration:

```javascript
// fields.js
module.exports = {
  firstName: {
    type: 'text',
    validate: ['required', { type: 'maxlength', arguments: [30] }],
    formatter: ['trim', 'singlespaces']
  },
  lastName: {
    type: 'text',
    validate: ['required', { type: 'maxlength', arguments: [30] }],
    formatter: ['trim', 'singlespaces']
  },
  email: {
    validate: ['required', 'email']
  },
  age: {
    type: 'number',
    validate: ['required', 'numeric', 
      { type: 'range', fn: value => value >= 18 && value <= 100 }
    ]
  },
  country: {
    validate: ['required'],
    invalidates: ['state']
  },
  state: {
    dependent: { field: 'country', value: 'US' },
    validate: 'required'
  }
};
```

### Zod Migration:

```javascript
// schemas.js
import { z } from 'zod';

// Helper for common string formatting
const formattedString = (maxLength) => 
  z.string()
    .transform(val => val.trim().replace(/\s+/g, ' '))
    .pipe(z.string().max(maxLength));

const registrationSchema = z.object({
  firstName: formattedString(30)
    .min(1, { message: 'First name is required' }),
  
  lastName: formattedString(30)
    .min(1, { message: 'Last name is required' }),
  
  email: z.string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  
  age: z.coerce.number()
    .int({ message: 'Age must be a whole number' })
    .min(18, { message: 'Must be at least 18' })
    .max(100, { message: 'Must be at most 100' }),
  
  country: z.string()
    .min(1, { message: 'Country is required' }),
  
  state: z.string().optional()
}).refine(
  // Conditional validation for state
  (data) => {
    if (data.country === 'US' && !data.state) {
      return false;
    }
    return true;
  },
  {
    message: 'State is required for US',
    path: ['state']
  }
).transform((data) => {
  // Handle field invalidation
  if (data.country !== 'US') {
    data.state = undefined;
  }
  return data;
});

// Usage
const result = registrationSchema.safeParse(formData);
if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  // Handle errors
} else {
  const validData = result.data;
  // Process valid data
}
```

## Key Benefits of Zod

1. **Type Safety**: Full TypeScript support with inferred types
2. **Composability**: Schemas can be composed and extended
3. **Better Error Messages**: More control over error formatting
4. **Schema Reuse**: Define once, use for validation and type generation
5. **Modern API**: Chainable methods, async support, transforms
6. **No Dependencies**: Zero external dependencies unlike hmpo-form-wizard

## Best Practices for Migration

1. **Start with Schema Definition**: Define all Zod schemas upfront
2. **Use safeParse**: Always use safeParse instead of parse for form validation
3. **Centralize Schemas**: Keep all schemas in a dedicated module
4. **Leverage Transforms**: Use transforms for formatting instead of separate formatters
5. **Test Thoroughly**: Ensure all edge cases from HMPO validators are covered
6. **Progressive Enhancement**: Migrate one form at a time using the Strangler Fig pattern

## Conclusion

While hmpo-form-wizard provides a declarative, configuration-based approach to validation, Zod offers a more flexible, type-safe, and modern alternative. The migration requires translating string-based validators to schema methods, but results in more maintainable and testable code with better developer experience.