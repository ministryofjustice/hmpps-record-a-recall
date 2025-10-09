import RevocationDatePage from '../pages/Journey/revocationDatePage'
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
    cy.task('stubSearchCourtCasesWithBothSDS')
    cy.task('stubRecallPersonNonManual', { sortBy: 'desc' })
    cy.task('stubRecallRecorded')
    cy.task('stubNomisMapping')
  })

  it('should complete the full recall creation journey', () => {
    cy.signIn()

    // Step 1: Go to person and start recall
    cy.visit('/person/BA1234AB')
    // Navigate directly to recall flow instead of clicking button
    cy.visit('/person/BA1234AB/record-recall')

    // Step 2: Revocation date
    Page.verifyOnPage(RevocationDatePage).enterRevocationDate('2021-04-04').clickContinue()

    // Step 3: RTC date page (V2 combines "Was in prison" question here)
    // Check we're on the RTC date page with the combined question
    cy.contains('h1', 'Was this person in prison when the recall was made?').should('exist')
    // Select "Yes" for in prison
    cy.get('[value=true]').click()
    // Submit the form (V2 uses standard submit button)
    cy.get('#submit').click()

    // Debug: Check for redirect and what page we land on
    cy.url().then(url => {
      cy.log('Current URL after RTC submission:', url)
      // If we're at the person page instead of the expected page, log the body content
      if (url.includes('/person/BA1234AB') && !url.includes('record-recall')) {
        cy.log('ERROR: Redirected to person page instead of continuing recall flow')
        cy.get('body').then($body => {
          cy.log('Page content:', $body.text().substring(0, 500))
        })
      }
    })
    cy.get('h1').then($h1 => {
      cy.log('Current H1:', $h1.text())
    })

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
