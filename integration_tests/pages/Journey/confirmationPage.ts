import Page from '../page'

export default class ConfirmationPage extends Page {
  constructor() {
    super('Recall recorded')
  }

  verifySuccessMessage(message: string): this {
    cy.contains(message)
    return this
  }
}
