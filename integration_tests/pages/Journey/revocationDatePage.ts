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
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}
