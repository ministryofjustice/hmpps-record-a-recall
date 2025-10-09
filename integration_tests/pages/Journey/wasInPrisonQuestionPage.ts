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
    // Try data-qa first, fallback to id=submit for v2 flow
    cy.get('body').then($body => {
      if ($body.find('[data-qa=continue-btn]').length > 0) {
        cy.get('[data-qa=continue-btn]').click()
      } else {
        cy.get('#submit').click()
      }
    })
    return this
  }
}
