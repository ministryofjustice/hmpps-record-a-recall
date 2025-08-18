import Page from '../page'

export default class UpdateSentenceTypesSummaryPage extends Page {
  constructor() {
    super('Update sentence types')
  }

  expectSingleSentenceMessage(): this {
    cy.get('.govuk-body.govuk-\\!-font-weight-bold').should('contain', '1 sentence to update')
    return this
  }
}
