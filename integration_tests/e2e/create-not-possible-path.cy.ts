import PersonHomePage from '../pages/personHome'
import Page from '../pages/page'
import { ValidationMessage } from '../../server/@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import RecallNotPossiblePage from '../pages/Journey/recallNotPossiblePage'
import RevocationDatePage from '../pages/Journey/revocationDatePage'

context('Creating a recall is not possible path', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch')
    cy.task('stubRecordARecallCRDS')
    cy.task('stubSentencesAndOffences')
    cy.task('stubGetCalculationBreakdown')
    cy.task('stubGetCourtsByIds')
    cy.task('stubSearchCourtCases', { sortBy: 'desc' })
    cy.task('stubRecallPerson', { sortBy: 'desc' })
    cy.task('stubRecallRecorded')
    cy.task('stubNomisMapping')
  })

  it('should show "You cannot record a recall" with single validation message, go back to home page and also start again', () => {
    cy.signIn()

    const validationMessages: ValidationMessage[] = [
      {
        code: 'OFFENCE_MISSING_DATE',
        message: 'Some message about a missing offence date',
        type: 'VALIDATION',
        arguments: [],
      },
    ]
    cy.task('stubRecordARecallCRDSWithValidationMessages', validationMessages)

    // Step 1: Start recall
    PersonHomePage.goTo('A1234AB') //
      .createNewRecallButton()
      .click()

    // Step 2: You cannot record a recall page shown then go back
    Page.verifyOnPage(RecallNotPossiblePage) //
      .expectSingleErrorMessage('This is because some message about a missing offence date')
      .expectBackLink('/person/A1234AB')
      .clickBack()

    // Step 3: Go back to home and start again
    Page.verifyOnPage(PersonHomePage) //
      .createNewRecallButton()
      .click()

    // Step 4: Shown not possible page again, fix in NOMIS and click start again
    const notPossiblePage = Page.verifyOnPage(RecallNotPossiblePage)
    cy.task('stubRecordARecallCRDSNonManual') // fix in NOMIS
    notPossiblePage //
      .expectStartAgainLink('/person/A1234AB/record-recall?entrypoint=recalls')
      .clickStartAgain()

    // Step 5: Should now show revocation page as recall is possible
    Page.verifyOnPage(RevocationDatePage)
  })

  it('should show "You cannot record a recall" with multiple validation messages', () => {
    cy.signIn()

    const validationMessages: ValidationMessage[] = [
      {
        code: 'OFFENCE_MISSING_DATE',
        message: 'Some message about a missing offence date',
        type: 'VALIDATION',
        arguments: ['1', '1'],
      },
      {
        code: 'OFFENCE_MISSING_DATE',
        message: 'Another offence with a missing start date',
        type: 'VALIDATION',
        arguments: ['1', '2'],
      },
    ]
    cy.task('stubRecordARecallCRDSWithValidationMessages', validationMessages)

    // Step 1: Start recall
    PersonHomePage.goTo('A1234AB') //
      .createNewRecallButton()
      .click()

    // Step 2: You cannot record a recall page shown with multiple messages
    Page.verifyOnPage(RecallNotPossiblePage) //
      .expectHasMultipleErrorMessages()
      .expectMultiErrorMessage('Some message about a missing offence date', 1)
      .expectMultiErrorMessage('Another offence with a missing start date', 2)
  })

  it('should be able to go back to CCARD', () => {
    cy.signIn()

    const validationMessages: ValidationMessage[] = [
      {
        code: 'OFFENCE_MISSING_DATE',
        message: 'Some message about a missing offence date',
        type: 'VALIDATION',
        arguments: [],
      },
    ]
    cy.task('stubRecordARecallCRDSWithValidationMessages', validationMessages)

    // Step 1: Start recall from CCARD
    cy.visit(`/person/A1234AB/record-recall?entrypoint=ccards`)

    // Step 2: You cannot record a recall page shown, back link goes to CCARD and start again keeps the entrypoint
    Page.verifyOnPage(RecallNotPossiblePage) //
      .expectSingleErrorMessage('This is because some message about a missing offence date')
      .expectBackLink('https://court-cases-release-dates-dev.hmpps.service.justice.gov.uk/prisoner/A1234AB/overview')
      .expectStartAgainLink('/person/A1234AB/record-recall?entrypoint=ccards')
      .clickBack()
  })

  it('should be able to go back to adjustments', () => {
    cy.signIn()

    const validationMessages: ValidationMessage[] = [
      {
        code: 'OFFENCE_MISSING_DATE',
        message: 'Some message about a missing offence date',
        type: 'VALIDATION',
        arguments: [],
      },
    ]
    cy.task('stubRecordARecallCRDSWithValidationMessages', validationMessages)

    // Step 1: Start recall from Adjustments
    cy.visit(`/person/A1234AB/record-recall?entrypoint=adj_foo`)

    // Step 2: You cannot record a recall page shown, back link goes to CCARD and start again keeps the entrypoint
    Page.verifyOnPage(RecallNotPossiblePage) //
      .expectSingleErrorMessage('This is because some message about a missing offence date')
      .expectBackLink('https://adjustments-dev.hmpps.service.justice.gov.uk/A1234AB/foo/view')
      .expectStartAgainLink('/person/A1234AB/record-recall?entrypoint=adj_foo')
      .clickBack()
  })
})
