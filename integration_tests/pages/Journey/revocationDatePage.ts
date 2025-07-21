// import dayjs from 'dayjs'
// import ReviewFormPage from './reviewFormPage'

// export default class RevocationDatePage extends ReviewFormPage {
//   constructor(title: string) {
//     super(title)
//   }

//   public enterRevocationDate = (date: string): void => {
//     const days = dayjs(date).get('date').toString()
//     const months = (dayjs(date).get('month') + 1).toString()
//     const years = dayjs(date).get('year').toString()

//     cy.get('[name=revocationDate-day]').type(days)
//     cy.get('[name=revocationDate-month]').type(months)
//     cy.get('[name=revocationDate-year]').type(years)
//   }
// }

import Page from '../page'

export default class RevocationDatePage extends Page {
  constructor() {
    super('Enter the date of revocation')
  }

  enterRevocationDate(date: string): this {
    cy.get('[name=revocationDate-day]').clear().type(date.split('-')[2])
    cy.get('[name=revocationDate-month]').clear().type(date.split('-')[1])
    cy.get('[name=revocationDate-year]').clear().type(date.split('-')[0])
    return this
  }

  clickContinue(): this {
    cy.get('[data-qa=continue-btn]').click()
    return this
  }
}
