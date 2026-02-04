import { test, expect } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

// Mock API stubs
import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import hmppsAuth from '../mockApis/hmppsAuth'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import ccardsApi from '../mockApis/ccardApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'

// Page objects
import HomePage from '../pages/homePage'
import RevocationDatePage from '../pages/revocationDatePage'

test('user can see the person home and click record a recall', async ({ page }) => {
  // Reset stubs
  await resetStubs()
  await hmppsAuth.stubSignInPage()
  await frontendComponentsApi.stubComponents()
  await prisonerSearchApi.stubPrisonerSearchNonManual()

  // Use the correct stub for recalls
  await remandAndSentencingApi.stubTest()
  await remandAndSentencingApi.stubHasSentences()
  await ccardsApi.getServiceDefinitions()
  await prisonRegisterApi.getPrisonsByPrisonIds()
  await courtRegisterApi.stubGetCourtsByIds()
  await manageOffencesApi.getOffencesByCodes()
  await prisonApi.stubGetPrisonerImage()
  await calculateReleaseDatesApi.stubCalculateReleaseDatesValidate()

  // Login
  await login(page)

  // Go to the person's home page
  await page.goto('/person/BA1234AB')

  // Verify home page loaded
  const homePage = await HomePage.verifyOnPage(page)

  await homePage.createNewRecallButton.click()

  // Verify revocation date page loads
  const revocationPage = await RevocationDatePage.verifyOnPage(page)
  await revocationPage.enterRevocationDate('2018-04-02')
  await revocationPage.clickContinue()
})
