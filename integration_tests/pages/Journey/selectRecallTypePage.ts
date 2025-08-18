import Page from '../page'

export default class SelectRecallTypePage extends Page {
  constructor() {
    super('Select the type of recall')
  }

  selectRecallType(): this {
    cy.get('[name=recallType]').first().click()
    return this
  }

  clickContinue(): this {
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}
