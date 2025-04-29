import { defineConfig } from 'cypress'
import { resetStubs } from './integration_tests/mockApis/wiremock'
import auth from './integration_tests/mockApis/auth'
import manageUsers from './integration_tests/mockApis/manageUsersApi'
import tokenVerification from './integration_tests/mockApis/tokenVerification'
import prisonerSearch from './integration_tests/mockApis/prisonerSearchApi'
import remandAndSentencingApi from './integration_tests/mockApis/remandAndSentencingApi'
import calculateReleaseDatesApi from './integration_tests/mockApis/calculateReleaseDatesApi'
import courtRegister from './integration_tests/mockApis/courtRegisterApi'

export default defineConfig({
  chromeWebSecurity: false,
  fixturesFolder: 'integration_tests/fixtures',
  screenshotsFolder: 'integration_tests/screenshots',
  videosFolder: 'integration_tests/videos',
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'reporter-config.json',
  },
  taskTimeout: 60000,
  e2e: {
    setupNodeEvents(on) {
      on('task', {
        reset: resetStubs,
        ...auth,
        ...manageUsers,
        ...tokenVerification,
        ...prisonerSearch,
        ...remandAndSentencingApi,
        ...calculateReleaseDatesApi,
        ...courtRegister,
      })
    },
    baseUrl: 'http://localhost:3007',
    excludeSpecPattern: '**/!(*.cy).ts',
    specPattern: 'integration_tests/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'integration_tests/support/index.ts',
  },
})
