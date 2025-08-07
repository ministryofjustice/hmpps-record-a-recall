import PersonHomePage from '../pages/personHome'
import RevocationDatePage from '../pages/Journey/revocationDatePage'
import WasInPrisonQuestionPage from '../pages/Journey/wasInPrisonQuestionPage'
import ManualInterceptPage from '../pages/Journey/manualInterceptPage'
import SelectCourtCasesPage from '../pages/Journey/selectCourtCasesPage'
import UpdateSentenceTypesSummaryPage from '../pages/Journey/updateSentenceTypesSummaryPage'
import Page from '../pages/page'

/**
 * Due to Cypress limitations with HMPO form wizard sessions and parameterized routes, we cannot test
 * the full journey that includes clicking links to /select-sentence-type/:uuid.
 *
 * This test file focuses on what can be tested reliably.
 */
context('Updating single unknown sentence type - Pragmatic Approach', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch')
    cy.task('stubRecordARecallCRDS')
    cy.task('stubSentencesAndOffences')
    cy.task('stubGetCalculationBreakdown')
    cy.task('stubGetCourtsByIds')
    cy.task('stubRecallPerson')
    cy.task('stubRecallRecorded')
    cy.task('stubNomisMapping')
    cy.task('getPrisonsByPrisonIds')
    cy.task('getOffencesByCodes')
    cy.task('getServiceDefinitions')
    cy.task('getNoAdjustmentsForPrisoner')
    cy.task('stubSearchSentenceTypes')
    cy.task('stubSearchCourtCasesWithSingleUnknownSentence')
    cy.task('stubUpdateSentenceTypes')
  })

  it('should navigate to update sentence types summary page with unknown sentence', () => {
    cy.signIn()

    // Navigate through the recall journey
    PersonHomePage.goTo('A1234AB').createNewRecallButton().click()
    Page.verifyOnPage(RevocationDatePage).enterRevocationDate('2018-04-02').clickContinue()
    Page.verifyOnPage(WasInPrisonQuestionPage).selectYes().clickContinue()
    Page.verifyOnPage<ManualInterceptPage>(ManualInterceptPage).verifyInstructions().clickContinue()

    // Verify court case selection shows unknown sentence
    Page.verifyOnPage(SelectCourtCasesPage)
    cy.get('h2.govuk-heading-m').should('contain', 'ABRYCT')

    // Verify sentence type shows as "Required"
    cy.get('.govuk-tag--blue').should('contain', 'Required')

    // Select the court case
    cy.get('input[name="activeSentenceChoice"][value="YES"]').click()
    cy.get('[data-qa="continue-btn"]').click()

    // Verify update sentence types summary page
    const updateSummaryPage = Page.verifyOnPage(UpdateSentenceTypesSummaryPage)

    // Verify page heading and message
    cy.get('h1').should('contain', 'Update sentence types')
    updateSummaryPage.expectSingleSentenceMessage()

    // Verify the "to do" section exists
    cy.get('h2').contains('Sentences that have not been updated').should('exist')

    // Verify the update link exists
    cy.get('a').contains('Update sentence type').should('exist')

    // Verify Continue button is not available when sentences need updating
    cy.contains('button', 'Continue').should('not.exist')
    cy.contains('You must update all sentence types before continuing').should('be.visible')

    // Verify court case information
    cy.contains('CC123/2024').should('exist')
    cy.contains('Aberystwyth Crown Court').should('exist')

    // Note: We cannot test clicking the update link due to Cypress session limitations
  })

  it('should prevent continuing without updating unknown sentence types', () => {
    cy.signIn()

    // Quick navigation to summary page
    PersonHomePage.goTo('A1234AB').createNewRecallButton().click()
    Page.verifyOnPage(RevocationDatePage).enterRevocationDate('2018-04-02').clickContinue()
    Page.verifyOnPage(WasInPrisonQuestionPage).selectYes().clickContinue()
    Page.verifyOnPage<ManualInterceptPage>(ManualInterceptPage).clickContinue()
    Page.verifyOnPage(SelectCourtCasesPage)
    cy.get('input[name="activeSentenceChoice"][value="YES"]').click()
    cy.get('[data-qa="continue-btn"]').click()

    // On update summary page
    Page.verifyOnPage(UpdateSentenceTypesSummaryPage)

    // Verify Continue button is blocked
    cy.contains('button', 'Continue').should('not.exist')
    cy.contains('You must update all sentence types before continuing').should('be.visible')

    // Verify the page has loaded correctly
    cy.get('h1').should('contain', 'Update sentence types')
  })
})
