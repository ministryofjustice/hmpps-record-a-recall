import FormPage from '../form'
import { PageElement } from '../page'

export default class formPage extends FormPage {
  constructor(title: string) {
    super(title)
  }

  public affectsDatesRadio = (): PageElement => cy.get('[value=true]')

  public recallTypeRadio = (): PageElement => cy.get('[value="LR"]')

  public successMessage = (): PageElement => cy.get('[data-qa=success-message]')

  public selectFirstCourtCaseCheckbox = (): PageElement => cy.get('input[type="checkbox"][name="courtCases"]').check()
}