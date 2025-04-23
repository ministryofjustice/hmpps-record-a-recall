import FormPage from '../form'
import { PageElement } from '../page'

export default class ReviewFormPage extends FormPage {
    constructor() {
      super('Confirm and save')
    }

    public continueButton(): PageElement {
      return cy.get(`[data-qa=continue-btn]`)
    }
  
    public confirmAndContinueButton(): PageElement {
      return cy.get(`[data-qa=confirm-and-continue-btn]`)
    }
  
    public confirmRecallBtn(): PageElement {
      return cy.get(`[data-qa=confirm-recall-btn]`)
    }
  
    public submit = (): PageElement => cy.get('[data-qa=submit]')
  }