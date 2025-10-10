import Page from '../page'

export default class RevocationDatePage extends Page {
  constructor() {
    super('Enter the date of revocation')
  }

  enterRevocationDate(date: string): this {
    const [year, month, day] = date.split('-')

    cy.get('[name=revocationDate-day]').clear()
    cy.get('[name=revocationDate-day]').type(day)

    cy.get('[name=revocationDate-month]').clear()
    cy.get('[name=revocationDate-month]').type(month)

    cy.get('[name=revocationDate-year]').clear()
    cy.get('[name=revocationDate-year]').type(year)

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
