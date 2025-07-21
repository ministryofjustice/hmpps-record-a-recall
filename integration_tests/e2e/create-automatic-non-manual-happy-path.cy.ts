import PersonHomePage from '../pages/personHome'
import RevocationDatePage from '../pages/Journey/revocationDatePage'
import WasInPrisonQuestionPage from '../pages/Journey/wasInPrisonQuestionPage'
import CheckSentencesPage from '../pages/Journey/checkSentencesPage'
import SelectRecallTypePage from '../pages/Journey/selectRecallTypePage'
import CheckYourAnswersPage from '../pages/Journey/checkYourAnswersPage'
import ConfirmationPage from '../pages/Journey/confirmationPage'
import Page from '../pages/page'

context('Create recall happy path | NON-MANUAL', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearchNonManual')
    cy.task('stubRecordARecallCRDSNonManual')
    cy.task('stubSentencesAndOffences')

    cy.task('stubGetCalculationBreakdown')
    cy.task('stubGetCourtsByIds')
    cy.task('stubSearchCourtCasesWithBothSDS', { sortBy: 'desc' })
    cy.task('stubRecallPersonNonManual', { sortBy: 'desc' })
    cy.task('stubRecallRecorded')
    cy.task('stubNomisMapping')
  })

  it('should complete the full recall creation journey', () => {
    cy.signIn()

    // Step 1: Go to person and start recall
    PersonHomePage.goTo('BA1234AB').createNewRecallButton().click()

    // Step 2: Revocation date
    Page.verifyOnPage(RevocationDatePage).enterRevocationDate('2021-04-04').clickContinue()

    // Step 3: Was in prison
    Page.verifyOnPage(WasInPrisonQuestionPage).selectYes().clickContinue()

    // Step 4: Check sentences
    Page.verifyOnPage(CheckSentencesPage).confirmAndContinue()

    // Step 5: Select recall type
    Page.verifyOnPage(SelectRecallTypePage).selectRecallType().clickContinue()

    // Step 6: Check your answers
    Page.verifyOnPage(CheckYourAnswersPage).confirmRecall()

    // Final Step: Confirmation
    Page.verifyOnPage(ConfirmationPage).verifySuccessMessage('Recall recorded')
  })
})
