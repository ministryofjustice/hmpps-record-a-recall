import { expect, test } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

// Mock API stubs
import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import ccardApi from '../mockApis/ccardApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'

// Page objects
import HomePage from '../pages/homePage'
import RevocationDatePage from '../pages/revocationDatePage'
import ReturnToCustodyDatePage from '../pages/returnToCustodayDatePage'
import CheckSentencesPage from '../pages/checkSentencesPage'
import SelectRecallTypePage from '../pages/selectRecallTypePage'
import CheckYourAnswersPage from '../pages/checkYourAnswersPage'
import ConfirmationPage from '../pages/confirmationPage'

test('Happy path Auto journey to record a recall', async ({ page }) => {
  // Reset stubs
  await resetStubs()
  await prisonerSearchApi.stubPrisonerSearch()
  await frontendComponentsApi.stubComponents()

  // Use the correct stub for recalls
  await remandAndSentencingApi.stubAllRecallsForPrisoner()
  await remandAndSentencingApi.stubHasSentences()
  await remandAndSentencingApi.stubSearchCourtCases()
  await remandAndSentencingApi.stubIsRecallPossible()
  await remandAndSentencingApi.stubCreateRecall()
  await ccardApi.getServiceDefinitions()
  await prisonRegisterApi.getPrisonsByPrisonIds()
  await courtRegisterApi.stubGetCourtsByIds()
  await manageOffencesApi.getOffencesByCodes()
  await prisonApi.stubGetPrisonerImage()
  await calculateReleaseDatesApi.stubValidate()
  await calculateReleaseDatesApi.stubRecordARecallDecision()

  // Login
  await login(page)

  // Step 1: Home page
  await page.goto('/person/A0164ED')
  const homePage = await HomePage.verifyOnPage(page)
  await homePage.createNewRecallButton.click()

  // Step 2: Revocation Date page
  const revocationPage = await RevocationDatePage.verifyOnPage(page)
  await revocationPage.enterRevocationDate('2026', '02', '01')
  await revocationPage.clickContinue()

  // Step 3: Return to Custody Date page
  const returnToCustodyDatePage = await ReturnToCustodyDatePage.verifyOnPage(page)
  await returnToCustodyDatePage.selectYes()
  await expect(returnToCustodyDatePage.continueButton).toBeEnabled()
  await returnToCustodyDatePage.clickContinue()

  // Step 4: Check/Review sentences
  const checkSentencesPage = await CheckSentencesPage.verifyOnPage(page)
  await checkSentencesPage.confirmAndContinue()

  // Step 5: Select recall type
  const selectRecallTypePage = await SelectRecallTypePage.verifyOnPage(page)
  await selectRecallTypePage.selectStandardRecall()
  await selectRecallTypePage.clickContinue()

  // Step 6: Check your answers
  const checkYourAnswersPage = await CheckYourAnswersPage.verifyOnPage(page)
  await Promise.all([page.waitForURL(/recall\/.*\/confirmed$/), checkYourAnswersPage.confirmRecall()])

  // Step 7: Confirmation page
  const confirmationPage = await ConfirmationPage.verifyOnPage(page)
  await expect(confirmationPage.successMessage).toBeVisible()
  await confirmationPage.verifySuccessMessage('Recall recorded')
})
