# Continue HMPPS Recall E2E Test Stabilization

## Current Branch: RCLL-486-remove-form-wizard

## Context
FormWizard has been fully removed and replaced with Express + Zod validation. Most E2E tests have been fixed but there are server stability issues when running all tests together.

## Current Status: 21/22 Tests Passing (95.5%)
- ✅ Health: 5/5 passing
- ✅ SignIn: 8/8 passing (including token verification test)
- ✅ Automatic non-manual journey: 1/1 passing  
- ✅ Manual journey: 1/1 passing
- ✅ Not-possible paths: 4/4 passing
- ✅ Update sentence type: 2/2 passing
- ✅ Edit not-possible: 1/1 passing (when run individually)
- ⚠️ Server crashes when running all tests together

## What Was Fixed in Previous Session
1. **Edit Recall Flow** - Added CRDS validation middleware and not-possible route to edit flow
2. **SignIn Token Verification** - Fixed authentication to read user details from stubbed tokens dynamically

## Main Issue to Resolve
**Server Stability**: Tests pass individually but server crashes with port conflicts when running all tests together. The issue is:
- Nodemon restarts cause port binding conflicts
- Port 3007 shows "address already in use" errors
- Tests timeout waiting for server to be available

## Potential Solutions to Try
1. **Option 1**: Create a test-specific server startup script that doesn't use nodemon
2. **Option 2**: Add proper cleanup between test suites
3. **Option 3**: Use different ports for different test runs
4. **Option 4**: Add retry logic to handle server restarts
5. **Option 5**: Run tests sequentially with delays between suites

## Quick Start Commands
```bash
# Start Docker services
docker compose -f docker-compose-test.yml up -d

# Start dev server (current method - causes issues)
PORT=3007 CYPRESS=true npm run start-feature:dev

# Run all tests
npm run int-test

# Run individual test suites (these work)
npm run int-test -- --spec="integration_tests/e2e/signIn.cy.ts"
npm run int-test -- --spec="integration_tests/e2e/edit-not-possible-path.cy.ts"
```

## Files to Check
- `/server/middleware/setUpAuthentication.ts` - Updated auth callback
- `/server/routes/index.ts` - Edit recall route with CRDS validation
- `/server/routes/recall/edit/index.ts` - Edit recall router
- `/server/middleware/checkCrdsValidation.ts` - CRDS validation middleware
- `/server/views/pages/recall/edit/edit-summary.njk` - Edit summary template

## Important Notes
- All tests use MOCK APIs - never hit real servers
- Mocks defined in `/integration_tests/mockApis/`
- Test prisoner ID: 'A1234AB'
- Server MUST run with `CYPRESS=true` environment variable
- Views must be copied to dist: `npm run copy-views`

## Goal
Get all 22 tests passing reliably when running `npm run int-test` without server crashes or timeouts.

## Additional Context
- TypeScript compilation works correctly
- Individual tests prove the logic is correct
- Issue is environmental/infrastructure, not test logic
- May need to investigate nodemon configuration or alternative watchers

## Success Criteria
- All 22 tests pass in a single run
- No server crashes or port conflicts
- Tests can be run repeatedly without manual intervention
- CI/CD pipeline can run tests reliably