import PersonHome from '../pages/personHome'
import FormPage from '../pages/Journey/formPage'
import reviewFormPage from '../pages/Journey/reviewFormPage'
import RevocationDatePage from "../pages/Journey/revocationDatePage";
import ReviewFormPage from "../pages/Journey/reviewFormPage";
import formPage from "../pages/Journey/formPage";

context('Create recall happy path', () => {
  //let reviewPage: reviewFormPage


  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch')
    cy.task('stubValidate')
    cy.task('stubRecordARecallCRDS')
    //cy.task('stubRemandAndSentencing')
   // reviewPage = new reviewFormPage()
    // cy.task('stubUserRecall')
  })

  it('Click Create Recall Button', () => {
    cy.signIn()
    const personPage = PersonHome.goTo('ABC1234')
    personPage.createNewRecallButton().click()
    cy.url().should('include', '/person/ABC1234/record-recall/revocation-date')
    // personPage.headerUserName().should('contain.text', 'J. Smith')
  })

  // it('User name visible in header', () => {
  //   cy.signIn()
  //   const personPage = PersonHome.goTo('ABC1234')
  //   personPage.createNewRecallButton().click()
  //   personPage.headerUserName().should('contain.text', 'J. Smith')
  // })

  it('Enter a revocation date', () => {
    const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(RevocationDatePage, 'Enter the date of revocation')
    revocationPage.enterRevocationDate('2018-04-02')
    revocationPage.continueButton().click()
  })

  it('Yes/No Prison question', () => {
    const pageTitle = 'Was this person in prison when the recall was made?'
    cy.url().should('include', '/person/ABC1234/record-recall/rtc-date')
    const form = formPage.verifyOnPage<formPage>(formPage, pageTitle)
    form.affectsDatesRadio().click()
    new ReviewFormPage(pageTitle).continueButton()
  })
  //
  // it('Select court cases', () => {
  //   cy.url().should('include', '/person/ABC1234/record-recall/select-cases')
  //   const form = FormPage.verifyOnPage<FormPage>(FormPage, 'Select court cases')
  //   //cy.task('stubRemandAndSentencing')  need to mkock the court cases available to select
  //   form.affectsDatesRadio().click()// need to select a court case
  //   new reviewFormPage().continueButton().click()
  // })
  //
  // it('Check sentence(s) are correct', () => {
  //   cy.url().should('include', '/person/ABC1234/record-recall/check-sentences')
  //   const form = FormPage.verifyOnPage<FormPage>(FormPage, 'Check that the sentences and offences are correct')
  //   // check the correct sentence is visible
  //   new reviewFormPage().confirmAndContinueButton().click()
  // })
  //
  // it('Recall type', () => {
  //   cy.url().should('include', '/person/ABC1234/record-recall/recall-type')
  //   const form = FormPage.verifyOnPage<FormPage>(FormPage, 'Select the type of recall')
  //   form.recallTypeRadio().click()
  //   new reviewFormPage().continueButton().click()
  // })
  //
  // it('Check your answers', () => {
  //   cy.url().should('include', '/person/ABC1234/record-recall/check-your-answers')
  //   const form = FormPage.verifyOnPage<FormPage>(FormPage, 'Check your answers')
  //   new reviewFormPage().confirmRecallBtn().click()
  // })
  //
  // it('Recall successfully recorded for happy path', () => {
  //   cy.url().should('include', '/person/ABC1234/record-recall/recall-recorded')
  //   const form = FormPage.verifyOnPage<FormPage>(FormPage, 'What you can do next')
  //   form.successMessage().contains('Recall recorded')
  // })
})
