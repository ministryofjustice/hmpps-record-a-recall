import FormPage from '../form'
import { PageElement } from '../page'

export default class formPage extends FormPage {
  constructor(title: string) {
    super(title)
  }

  public affectsDatesRadio = (): PageElement => cy.get('[value=Yes]')

  public recallTypeRadio = (): PageElement => cy.get('[value=Standard]')

  public successMessage = (): PageElement => cy.get('[data-qa=success-message]')
}