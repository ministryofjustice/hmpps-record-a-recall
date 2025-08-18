import Page from '../page'

export default class CheckYourAnswersPage extends Page {
  constructor() {
    super('Check your answers')
  }

  confirmRecall(): this {
    cy.get('[data-qa=confirm-recall-btn]').click()
    return this
  }
}
