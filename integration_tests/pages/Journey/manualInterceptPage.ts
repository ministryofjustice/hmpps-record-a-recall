import Page from '../page'

export default class ManualInterceptPage extends Page {
  constructor() {
    super('Select all the cases that are relevant to this recall')
  }

  verifyInstructions(): this {
    cy.contains('Select all the cases that are relevant to this recall').should('exist')
    return this
  }

  clickContinue(): this {
    cy.get('button').contains('Continue').click()
    return this
  }
}
