import Page from '../page'

export default class WasInPrisonQuestionPage extends Page {
  constructor() {
    super('Was this person in prison when the recall was made')
  }

  selectYes(): this {
    cy.get('[value=true]').click()
    return this
  }

  clickContinue(): this {
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}
