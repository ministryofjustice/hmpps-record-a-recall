import PersonHome from '../pages/personHome'
import FormPage from '../pages/Journey/formPage'
import RevocationDatePage from '../pages/Journey/revocationDatePage'
import ReviewFormPage from '../pages/Journey/reviewFormPage'

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
    const personPage = PersonHome.goTo('BA1234AB')
    personPage.createNewRecallButton().click()
    cy.url().should('include', '/person/BA1234AB/record-recall/revocation-date')

    // Step 2: Revocation date
    const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
      RevocationDatePage,
      'Enter the date of revocation',
    )
    revocationPage.enterRevocationDate('2021-04-04')
    revocationPage.continueButton().click()

    // Step 3: Was this person in prison?
    const prisonQuestionTitle = 'Was this person in prison when the recall was made?'
    cy.url().should('include', '/person/BA1234AB/record-recall/rtc-date')
    const prisonForm = FormPage.verifyOnPage<FormPage>(FormPage, prisonQuestionTitle)
    prisonForm.affectsDatesRadio().click()
    new ReviewFormPage(prisonQuestionTitle).continueButton().click()

    // Step 4: Check sentences
    const sentenceCheckTitle = 'Check that the sentences and offences are correct'
    cy.url().should('include', '/person/BA1234AB/record-recall/check-sentences')
    FormPage.verifyOnPage<FormPage>(FormPage, sentenceCheckTitle)
    new ReviewFormPage(sentenceCheckTitle).confirmAndContinueButton().click()

    // Step 5: Select recall type
    const recallTypeTitle = 'Select the type of recall'
    cy.url().should('include', '/person/BA1234AB/record-recall/recall-type')
    const recallTypeForm = FormPage.verifyOnPage<FormPage>(FormPage, recallTypeTitle)
    recallTypeForm.recallTypeRadio().click()
    new ReviewFormPage(recallTypeTitle).continueButton().click()

    // Step 6: Check your answers
    const checkAnswersTitle = 'Check your answers'
    cy.url().should('include', '/person/BA1234AB/record-recall/check-your-answers')
    FormPage.verifyOnPage<FormPage>(FormPage, checkAnswersTitle)
    new ReviewFormPage(checkAnswersTitle).confirmRecallBtn().click()

    // Final Step: Confirmation
    cy.url().should('include', '/person/BA1234AB/record-recall/recall-recorded')
    const confirmationForm = FormPage.verifyOnPage<FormPage>(FormPage, 'What you can do next')
    confirmationForm.successMessage().contains('Recall recorded')
  })
})
