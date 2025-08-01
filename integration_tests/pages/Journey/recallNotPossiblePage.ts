import Page, { PageElement } from '../page'

export default class RecallNotPossiblePage extends Page {
  constructor() {
    super('You cannot record a recall')
  }

  expectSingleErrorMessage(message: string): RecallNotPossiblePage {
    cy.get('[data-qa=single-validation-message]').should('have.text', message)
    return this
  }

  expectHasMultipleErrorMessages(): RecallNotPossiblePage {
    cy.get('[data-qa=multi-validation-message-heading]').should('have.text', 'This is because:')
    return this
  }

  expectMultiErrorMessage(message: string, index: number): RecallNotPossiblePage {
    cy.get(`[data-qa=multi-validation-message-${index}]`).should('have.text', message)
    return this
  }

  expectBackLink(expectedLink: string): RecallNotPossiblePage {
    this.backLink().should('have.attr', 'href', expectedLink)
    return this
  }

  clickBack() {
    return this.backLink().click()
  }

  expectStartAgainLink(expectedLink: string): RecallNotPossiblePage {
    this.startAgainLink().should('have.attr', 'href', expectedLink)
    return this
  }

  clickStartAgain() {
    return this.startAgainLink().click()
  }

  private backLink = (): PageElement => cy.findByRole('link', { name: 'Back' })

  private startAgainLink = (): PageElement => cy.findByRole('link', { name: 'start again' })
}
