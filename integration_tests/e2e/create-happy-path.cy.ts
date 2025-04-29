import PersonHome from '../pages/personHome'
import FormPage from '../pages/Journey/formPage'
import RevocationDatePage from "../pages/Journey/revocationDatePage"
import ReviewFormPage from "../pages/Journey/reviewFormPage"
import formPage from "../pages/Journey/formPage"

context('Create recall happy path', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch')
    cy.task('stubValidate')
    cy.task('stubRecordARecallCRDS')
    cy.task('stubSentencesAndOffences')
    cy.task('stubGetCalculationBreakdown')
    cy.task('stubGetCourtsByIds')

    // If needed for later steps:
    cy.task('stubSearchCourtCases', { sortBy: 'desc' })
    // cy.task('stubGetPrisonerImageData')
    // cy.task('stubGetPrisonerDetails')
    console.log('-------------stubbed')
    // cy.task('stubUserRecall') // optional depending on your app
  })

  it('should complete the full recall creation journey', () => {
    cy.signIn()

    // Step 1: Go to person and start recall
    const personPage = PersonHome.goTo('A1234AB')
    personPage.createNewRecallButton().click()
    cy.url().should('include', '/person/A1234AB/record-recall/revocation-date')

    // Step 2: Revocation date
    const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(RevocationDatePage, 'Enter the date of revocation')
    revocationPage.enterRevocationDate('2018-04-02')
    revocationPage.continueButton().click()

    // Step 3: Was this person in prison?
    const prisonQuestionTitle = 'Was this person in prison when the recall was made?'
    cy.url().should('include', '/person/A1234AB/record-recall/rtc-date')
    const prisonForm = formPage.verifyOnPage<formPage>(formPage, prisonQuestionTitle)
    prisonForm.affectsDatesRadio().click()
    new ReviewFormPage(prisonQuestionTitle).continueButton().click()

    // Step 4: Select court cases
    const selectCasesTitle = 'Select court cases'
    cy.url().should('include', '/person/A1234AB/record-recall/select-cases')
    const selectCasesForm = FormPage.verifyOnPage<FormPage>(FormPage, selectCasesTitle)
    selectCasesForm.affectsDatesRadio().click() // Replace if needed with actual case selector
    new ReviewFormPage(selectCasesTitle).continueButton().click()

  //   // Step 5: Check sentences
  //   const sentenceCheckTitle = 'Check that the sentences and offences are correct'
  //   cy.url().should('include', '/person/ABC1234/record-recall/check-sentences')
  //   const sentenceForm = FormPage.verifyOnPage<FormPage>(FormPage, sentenceCheckTitle)
  //   new ReviewFormPage(sentenceCheckTitle).confirmAndContinueButton().click()

  //   // Step 6: Select recall type
  //   const recallTypeTitle = 'Select the type of recall'
  //   cy.url().should('include', '/person/ABC1234/record-recall/recall-type')
  //   const recallTypeForm = FormPage.verifyOnPage<FormPage>(FormPage, recallTypeTitle)
  //   recallTypeForm.recallTypeRadio().click()
  //   new ReviewFormPage(recallTypeTitle).continueButton().click()

  //   // Step 7: Check your answers
  //   const checkAnswersTitle = 'Check your answers'
  //   cy.url().should('include', '/person/ABC1234/record-recall/check-your-answers')
  //   const checkAnswersForm = FormPage.verifyOnPage<FormPage>(FormPage, checkAnswersTitle)
  //   new ReviewFormPage(checkAnswersTitle).confirmRecallBtn().click()

  //   // Final Step: Confirmation
  //   cy.url().should('include', '/person/ABC1234/record-recall/recall-recorded')
  //   const confirmationForm = FormPage.verifyOnPage<FormPage>(FormPage, 'What you can do next')
  //   confirmationForm.successMessage().contains('Recall recorded')
   })
})




