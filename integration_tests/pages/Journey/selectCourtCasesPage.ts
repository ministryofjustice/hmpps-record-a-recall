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
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}
