import Page from '../page'

export default class CheckYourAnswersPage extends Page {
  constructor() {
    super('Check your answers')
  }

  confirmRecall(): this {
    // Try data-qa first, fallback to id=submit for v2 flow
    cy.get('body').then($body => {
      if ($body.find('[data-qa=confirm-recall-btn]').length > 0) {
        cy.get('[data-qa=confirm-recall-btn]').click()
      } else {
        cy.get('#submit').click()
      }
    })
    return this
  }
}
