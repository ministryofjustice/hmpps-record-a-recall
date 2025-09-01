import Page from '../page'

export default class CheckPossiblePage extends Page {
  constructor() {
    super('Can you confirm that the recall can proceed?')
  }

  confirmRecallCanProceed(): this {
    cy.get('[value=yes]').click()
    return this
  }

  clickContinue(): this {
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}