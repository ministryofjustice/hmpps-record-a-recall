// import PersonHomePage from '../pages/personHome'
// import Page from '../pages/page'
// import { ValidationMessage } from '../../server/@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
// import RecallNotPossiblePage from '../pages/Journey/recallNotPossiblePage'
// import EditRecallPage from '../pages/Journey/editRecallPage'
//
// context('Creating a recall is not possible path', () => {
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
//     cy.task('stubRecallPersonWithExistingRecall')
//     cy.task('stubSingleRecall', 'ABC')
//     cy.task('stubRecallRecorded')
//     cy.task('stubNomisMapping')
//     cy.task('getPrisonsByPrisonIds')
//     cy.task('getOffencesByCodes')
//     cy.task('getServiceDefinitions')
//     cy.task('getNoAdjustmentsForPrisoner')
//   })
//
//   it('should show "You cannot record a recall" with single validation message, go back to home page and also start again', () => {
//     cy.signIn()
//
//     const validationMessages: ValidationMessage[] = [
//       {
//         code: 'OFFENCE_MISSING_DATE',
//         message: 'Some message about a missing offence date',
//         type: 'VALIDATION',
//         arguments: [],
//       },
//     ]
//     cy.task('stubRecordARecallCRDSWithValidationMessages', validationMessages)
//
//     // Step 1: Start editing the recall
//     PersonHomePage.goTo('A1234AB')
//     cy.findByRole('link', { name: 'Edit recall recorded on 03 Mar 2018' }).click()
//
//     // Step 2: You cannot record a recall page shown then go back
//     Page.verifyOnPage(RecallNotPossiblePage, true) //
//       .expectSingleErrorMessage('This is because some message about a missing offence date')
//       .expectBackLink('/person/A1234AB')
//       .clickBack()
//
//     // Step 3: Go back to home and start again
//     Page.verifyOnPage(PersonHomePage)
//     cy.findByRole('link', { name: 'Edit recall recorded on 03 Mar 2018' }).click()
//
//     // Step 4: Shown not possible page again, fix in NOMIS and click start again
//     const notPossiblePage = Page.verifyOnPage(RecallNotPossiblePage, true)
//     cy.task('stubRecordARecallCRDSNonManual') // fix in NOMIS
//     notPossiblePage //
//       .expectStartAgainLink('/person/A1234AB/edit-recall/ABC?entrypoint=recalls')
//       .clickStartAgain()
//
//     // Step 5: Should now show edit recall page
//     Page.verifyOnPage(EditRecallPage, '02 Jan 2024')
//   })
// })
