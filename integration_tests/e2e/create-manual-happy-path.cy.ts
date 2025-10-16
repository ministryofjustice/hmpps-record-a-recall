// TODO FIX
// import PersonHomePage from '../pages/personHome'
// import RevocationDatePage from '../pages/Journey/revocationDatePage'
// import WasInPrisonQuestionPage from '../pages/Journey/wasInPrisonQuestionPage'
// import ManualInterceptPage from '../pages/Journey/manualInterceptPage'
// import SelectCourtCasesPage from '../pages/Journey/selectCourtCasesPage'
// import CheckSentencesPage from '../pages/Journey/checkSentencesPage'
// import SelectRecallTypePage from '../pages/Journey/selectRecallTypePage'
// import CheckYourAnswersPage from '../pages/Journey/checkYourAnswersPage'
// import ConfirmationPage from '../pages/Journey/confirmationPage'
// import Page from '../pages/page'
//
// context('Create recall happy path | MANUAL', () => {
//   beforeEach(() => {
//     cy.task('reset')
//     cy.task('stubSignIn')
//     cy.task('stubManageUsersMeCaseloads')
//     cy.task('stubPrisonerSearch')
//     cy.task('stubRecordARecallCRDS')
//     cy.task('stubSentencesAndOffences')
//     cy.task('stubGetCalculationBreakdown')
//     cy.task('stubGetCourtsByIds')
//     cy.task('stubSearchCourtCases', { sortBy: 'desc' })
//     cy.task('stubRecallPerson', { sortBy: 'desc' })
//     cy.task('stubRecallRecorded')
//     cy.task('stubNomisMapping')
//   })
//
//   it('should complete the full recall creation journey', () => {
//     cy.signIn()
//
//     // Step 1: Start recall
//     PersonHomePage.goTo('A1234AB').createNewRecallButton().click()
//
//     // Step 2: Revocation date
//     Page.verifyOnPage(RevocationDatePage).enterRevocationDate('2018-04-02').clickContinue()
//
//     // Step 3: Was in prison?
//     Page.verifyOnPage(WasInPrisonQuestionPage).selectYes().clickContinue()
//
//     // Step 4: Manual recall intercept
//     Page.verifyOnPage<ManualInterceptPage>(ManualInterceptPage).verifyInstructions().clickContinue()
//
//     // Step 5: Select court cases (x2)
//     Page.verifyOnPage(SelectCourtCasesPage).selectFirstCase().clickContinue()
//
//     Page.verifyOnPage(SelectCourtCasesPage).selectFirstCase().clickContinue()
//
//     // Step 6: Check sentences
//     Page.verifyOnPage(CheckSentencesPage).confirmAndContinue()
//
//     // Step 7: Select recall type
//     Page.verifyOnPage(SelectRecallTypePage).selectRecallType().clickContinue()
//
//     // Step 8: Check your answers
//     Page.verifyOnPage(CheckYourAnswersPage).confirmRecall()
//
//     // Final Step: Confirmation
//     Page.verifyOnPage(ConfirmationPage).verifySuccessMessage('Recall recorded')
//   })
// })
