import { expect, test } from '@playwright/test'
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
import ReturnToCustodyDatePage from '../pages/returnToCustodayDatePage'
import CheckSentencesPage from '../pages/checkSentencesPage'
import ManualSelectCourtCasesPage from '../pages/manualSelectCourtCasesPage'

test.beforeEach(async () => {
  await resetStubs()
  await prisonerSearchApi.stubPrisonerSearch()
  await frontendComponentsApi.stubComponents()
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
  await remandAndSentencingApi.stubFixManyCharges()
})

test('Switching from the auto journey to the manual journey via check sentences page link', async ({ page }) => {
  await login(page)

  await page.goto('/person/A0164ED')
  const homePage = await HomePage.verifyOnPage(page)
  await homePage.createNewRecallButton.click()

  const revocationPage = await RevocationDatePage.verifyOnPage(page)
  await revocationPage.enterRevocationDate('2026', '02', '01')
  await revocationPage.clickContinue()

  const returnToCustodyDatePage = await ReturnToCustodyDatePage.verifyOnPage(page)
  await returnToCustodyDatePage.selectYes()
  await returnToCustodyDatePage.clickContinue()

  const checkSentencesPage = await CheckSentencesPage.verifyOnPage(page)
  await expect(checkSentencesPage.manualSelectCasesLink).toBeVisible()
  await expect(checkSentencesPage.manualSelectCasesLink).toHaveText('manually select court cases')
  await expect(checkSentencesPage.manualSelectCasesLink).toHaveAttribute('href', /\/manual\/skip-intercept$/)

  // Act
  await checkSentencesPage.clickManualSelectCases()

  const selectCourtCasesPage = await ManualSelectCourtCasesPage.verifyOnPage(page)
  await expect(selectCourtCasesPage.backLink).toHaveAttribute('href', /\/review-sentences$/)

  await selectCourtCasesPage.selectYes()
  await selectCourtCasesPage.clickContinue()

  // Extra check that the manual journey's own check sentences page must NOT show the manual-select link
  const manualCheckSentencesPage = await CheckSentencesPage.verifyOnPage(page)
  await expect(manualCheckSentencesPage.manualSelectCasesLink).toHaveCount(0)
})
