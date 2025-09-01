# Final Cleanup: Remove FormWizard Compatibility Layer

## Context
The HMPO FormWizard to Express + Zod migration is functionally complete. All production code has been migrated, TypeScript compiles cleanly, and tests pass. However, the compatibility layer (`form-wizard-compat.ts` and `sessionModelAdapter.ts`) remains in the codebase despite no longer being needed.

## Investigation Results from Previous Session

### Current State
- ✅ All 21 controllers migrated to ExtendedRequest
- ✅ All 204 sessionModel references removed from production code
- ✅ 0 TypeScript errors
- ✅ 62/64 tests passing (baseline)

### Key Finding
**NO production code uses `req.sessionModel`** - it only exists in:
1. Test mocks that mock the wrong thing (they mock `req.sessionModel` when production uses session helpers)
2. The unused compatibility layer
3. The `ensureSessionModel` middleware that adds unused functionality

### Files Still Importing form-wizard-compat
```
server/helpers/sessionModelAdapter.ts (provides FormWizard.SessionModel type)
server/helpers/field/renderConditionalFields.test.ts (uses FormWizard.Request in tests)
server/helpers/field/reduceDependentFields.test.ts (uses FormWizard.Field in tests)
server/routes/recall/edit/__tests__/populate-stored-recall.test.ts (uses FormWizard.Request)
server/controllers/recall/revocationDateController.test.ts (uses FormWizard types)
```

## Task: Complete Final Cleanup

### Primary Objectives
1. **Remove `/server/@types/form-wizard-compat.ts`** completely
2. **Remove `/server/helpers/sessionModelAdapter.ts`** completely
3. **Remove `ensureSessionModel` middleware** from ExpressBaseController
4. **Fix test files** to use native types instead of FormWizard types
5. **Clean up any remaining references**

### Detailed Steps

#### 1. Fix Test Files First
- Update test files to use `ExtendedRequest` instead of `FormWizard.Request`
- Replace `FormWizard.Field` with the `Field` interface from ExpressBaseController
- Replace `FormWizard.Controller.Error` with a simple error object type
- Update test mocks to test actual session helpers instead of mocking `req.sessionModel`

#### 2. Remove Compatibility Layer
- Delete `/server/@types/form-wizard-compat.ts`
- Delete `/server/helpers/sessionModelAdapter.ts`
- Remove `createSessionModelAdapter` imports
- Remove `ensureSessionModel` middleware from ExpressBaseController
- Remove `sessionModel?: any` from ExtendedRequest interface

#### 3. Update Test Mocks
The following test files mock `req.sessionModel` but should mock session data directly:
- `resetAndRedirectToRevDateController.test.ts` - mocks `req.sessionModel.set/unset`
- `resetAndRedirectToManualInterceptController.test.ts` - mocks `req.sessionModel.set/unset`
- `updateSentenceTypesSummaryController.test.ts` - mocks `req.sessionModel.get`
- `bulkSentenceTypeController.test.ts` - mocks `req.sessionModel.get`

These should be updated to:
- Set `req.session.formData` directly for test data
- Mock the session helper functions instead

#### 4. Clean Up Controller Compatibility
- Remove unused imports of `controllerCompatibility.ts` functions
- Remove `toFormWizardRequest` function (no longer needed)
- Simplify `toExtendedRequest` function if still needed

### Expected Outcomes
- **0 references** to form-wizard-compat
- **0 references** to sessionModelAdapter
- **Cleaner codebase** without compatibility layers
- **All tests still passing** at 62/64
- **TypeScript still compiling** with 0 errors

### Testing Strategy
After each change:
1. Run `npm run typecheck` to ensure no TypeScript errors
2. Run `npm run test:ci` to ensure tests still pass
3. Run `npm run lint` to check for any new issues

### Files to Review
Check `/RCLL-486/REMAINING_TASKS.md` for migration history and `/RCLL-486/MIGRATION_GUIDE.md` for patterns used during migration.

### Success Metrics
- Complete removal of FormWizard compatibility layer
- No regression in test coverage or TypeScript compilation
- Codebase using only Express + Zod patterns

### Important Notes
- The `extendedRequestMock.ts` test utility created in the previous session should be used for creating test mocks
- The `sessionModelFields` constants in `formWizardHelper.ts` should remain (they're just string constants)
- Focus on removing the compatibility TYPES and ADAPTERS, not the actual session field names

Please begin by examining the test files that use FormWizard types and update them first, then proceed with removing the compatibility layer entirely.
