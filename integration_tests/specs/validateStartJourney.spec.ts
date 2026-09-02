import { test } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import ccardApi from '../mockApis/ccardApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'

import HomePage from '../pages/homePage'
import RevocationDatePage from '../pages/revocationDatePage'
import CriticalValidationSoftBlockPage from '../pages/criticalValidationSoftBlockPage'
import ConfirmCancelPage from '../pages/confirmCancelPage'

test.describe('Validation Intercepts from the start journey', () => {
  test.afterEach(async () => {
    await resetStubs()
  })
  test.beforeEach(async () => {
    await Promise.all([
      prisonerSearchApi.stubPrisonerSearch(),
      frontendComponentsApi.stubComponents(),
      remandAndSentencingApi.stubAllRecallsForPrisoner(),
      remandAndSentencingApi.stubHasSentences(),
      ccardApi.getServiceDefinitions(),
      prisonRegisterApi.getPrisonsByPrisonIds(),
      courtRegisterApi.stubGetCourtsByIds(),
      manageOffencesApi.getOffencesByCodes(),
      prisonApi.stubGetPrisonerImage(),
      calculateReleaseDatesApi.stubRecordARecallDecision(),
      remandAndSentencingApi.stubFixManyCharges(),
    ])
  })

  test('Critical error intercept and can continue to revocation date', async ({ page }) => {
    await calculateReleaseDatesApi.stubValidateLatestCriticalErrors()
    await login(page)

    await page.goto('/person/A0164ED')
    const homePage = await HomePage.verifyOnPage(page)
    await homePage.createNewRecallButton.click()

    const softBlockInterceptPage = await CriticalValidationSoftBlockPage.verifyOnPage(page)
    await softBlockInterceptPage.verifyMessages('This is because critical error one')
    await softBlockInterceptPage.continueButton.click()

    await RevocationDatePage.verifyOnPage(page)
  })

  test('Penultimate errors intercept and can continue to revocation date', async ({ page }) => {
    await calculateReleaseDatesApi.stubValidatePenultimateCriticalErrors()
    await login(page)

    await page.goto('/person/A0164ED')
    const homePage = await HomePage.verifyOnPage(page)
    await homePage.createNewRecallButton.click()

    const softBlockInterceptPage = await CriticalValidationSoftBlockPage.verifyOnPage(page)
    await softBlockInterceptPage.verifyMessages('This is because penultimate critical error one')
    await softBlockInterceptPage.continueButton.click()

    await RevocationDatePage.verifyOnPage(page)
  })

  test('Penultimate errors intercept and can cancel to confirm-cancel page', async ({ page }) => {
    await calculateReleaseDatesApi.stubValidatePenultimateCriticalErrors()
    await login(page)

    await page.goto('/person/A0164ED')
    const homePage = await HomePage.verifyOnPage(page)
    await homePage.createNewRecallButton.click()

    const softBlockInterceptPage = await CriticalValidationSoftBlockPage.verifyOnPage(page)
    await softBlockInterceptPage.verifyMessages('This is because penultimate critical error one')
    await softBlockInterceptPage.cancelButton.click()

    await ConfirmCancelPage.verifyOnPage(page)
  })
})
