import FormPage from '../form'
import dayjs from "dayjs";
import ReviewFormPage from "./reviewFormPage";

export default class RevocationDatePage extends ReviewFormPage {
  constructor(title: string) {
    super(title)
  }

  public enterRevocationDate = (date: string): void => {
    const days = dayjs(date).get('date').toString()
    const months = (dayjs(date).get('month') + 1).toString()
    const years = dayjs(date).get('year').toString()

    cy.get('[name=revocationDate-day]').type(days)
    cy.get('[name=revocationDate-month]').type(months)
    cy.get('[name=revocationDate-year]').type(years)
  }

}
