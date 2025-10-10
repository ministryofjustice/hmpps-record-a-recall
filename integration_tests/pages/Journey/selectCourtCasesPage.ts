import Page from '../page'

export default class SelectCourtCasesPage extends Page {
  constructor() {
    super('Select all cases that had an active sentence')
  }

  selectFirstCase(): this {
    cy.get('input[type=radio][value=YES]').first().check()
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
