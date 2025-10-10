import Page from '../page'

export default class CheckSentencesPage extends Page {
  constructor() {
    super('Check that the sentences and offences are correct')
  }

  confirmAndContinue(): this {
    // Try data-qa first, fallback to id=submit for v2 flow
    cy.get('body').then($body => {
      if ($body.find('[data-qa=confirm-and-continue-btn]').length > 0) {
        cy.get('[data-qa=confirm-and-continue-btn]').click()
      } else {
        cy.get('#submit').click()
      }
    })
    return this
  }
}
