import Page from '../page'

export default class CheckSentencesPage extends Page {
  constructor() {
    super('Check that the sentences and offences are correct')
  }

  confirmAndContinue(): this {
    cy.get('[data-qa=confirm-and-continue-btn]').click()
    return this
  }
}
