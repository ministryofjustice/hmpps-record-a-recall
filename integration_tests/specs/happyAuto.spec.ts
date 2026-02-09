import { test, expect } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

// Mock API stubs
import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import hmppsAuth from '../mockApis/hmppsAuth'
import tokenVerification from '../mockApis/tokenVerification'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import ccardsApi from '../mockApis/ccardApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'
import adjustmentsApi from '../mockApis/adjustmentsApi'

// Page objects
import HomePage from '../pages/homePage'
import RevocationDatePage from '../pages/revocationDatePage'
import ReturnToCustodyDatePage from '../pages/returnToCustodayDatePage'
import CheckSentencesPage from '../pages/checkSentencesPage'
import SelectRecallTypePage from '../pages/selectRecallTypePage'
import CheckYourAnswersPage from '../pages/checkYourAnswersPage'
import ConfirmationPage from '../pages/confirmationPage'

export const stubAllHealthChecks = async () => {
  await tokenVerification.stubPing()
  await tokenVerification.stubVerifyToken()
  await prisonApi.stubPing()
  await prisonerSearchApi.stubPing()
  await calculateReleaseDatesApi.stubPing()
  await remandAndSentencingApi.stubPing()
  await manageOffencesApi.stubPing()
  await prisonRegisterApi.stubPing()
  await adjustmentsApi.stubPing()
  await ccardsApi.stubPing()
  await frontendComponentsApi.stubPing()
  await courtRegisterApi.stubPing()
}

test('Happy path Auto journey to record a recall', async ({ page }) => {
  // Reset stubs
  await resetStubs()
  await stubAllHealthChecks()
  await hmppsAuth.stubSignInPage()
  await frontendComponentsApi.stubComponents()
  await prisonerSearchApi.stubPrisonerSearchNonManual()

  // Use the correct stub for recalls
  await remandAndSentencingApi.stubTest()
  await remandAndSentencingApi.stubHasSentences()
  await remandAndSentencingApi.stubSearchCourtCasesWithBothSDS()
  await remandAndSentencingApi.stubSearchCourtCases() //
  await ccardsApi.getServiceDefinitions()
  await ccardsApi.stubPing()
  await prisonRegisterApi.getPrisonsByPrisonIds()
  await courtRegisterApi.stubGetCourtsByIds()
  await manageOffencesApi.getOffencesByCodes()
  await prisonApi.stubGetPrisonerImage()
  await calculateReleaseDatesApi.stubCalculateReleaseDatesValidate()
  await calculateReleaseDatesApi.stubRecordARecallCRDSNonManual() // do we need to pass in {
//   "revocationDate": "2026-02-04",
//   "returnToCustodyDate": "2026-02-04",
//   "recallId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
// }
  // await calculateReleaseDatesApi.stubRecordARecallDecision()
  await prisonerSearchApi.stubPing()
  await adjustmentsApi.stubPing()

  // Login
  await login(page)

  // Step 1: Home page
  await page.goto('/person/BA1234AB')
  const homePage = await HomePage.verifyOnPage(page)
  await homePage.createNewRecallButton.click()

  // Step 2: Revocation Date page
  const revocationPage = await RevocationDatePage.verifyOnPage(page)
  await revocationPage.enterRevocationDate('2025-10-25')
  await revocationPage.clickContinue()

  // STep 3: Return to Custody Date page
  const returnToCustodyDatePage = await ReturnToCustodyDatePage.verifyOnPage(page)
  await returnToCustodyDatePage.selectYes() 
  // await returnToCustodyDatePage.selectNo()
  // await returnToCustodyDatePage.enterReturnToCustodyDate('2025-11-05')
  await returnToCustodyDatePage.clickContinue()

  // Step 4: Check sentences
  const checkSentencesPage = await CheckSentencesPage.verifyOnPage(page)
  await checkSentencesPage.confirmAndContinue()

  // Step 5: Select recall type
  const selectRecallTypePage = await SelectRecallTypePage.verifyOnPage(page)
  await selectRecallTypePage.selectRecallType() // implement method in page object
  await selectRecallTypePage.clickContinue()

  // Step 6: Check your answers
  const checkYourAnswersPage = await CheckYourAnswersPage.verifyOnPage(page)
  await checkYourAnswersPage.confirmRecall()

  // Step 7: Confirmation
  const confirmationPage = await ConfirmationPage.verifyOnPage(page)
  await confirmationPage.verifySuccessMessage('Recall recorded')
})
