import HmppsAuditClient, { AuditEvent } from '../data/hmppsAuditClient'

export enum Page {
  EXAMPLE_PAGE = 'EXAMPLE_PAGE',
  ENTER_RECALL_DATE = 'ENTER_RECALL_DATE',
  ENTER_RETURN_TO_CUSTODY_DATE = 'ENTER_RETURN_TO_CUSTODY_DATE',
  CHECK_SENTENCES = 'CHECK_SENTENCES',
  ENTER_RECALL_TYPE = 'ENTER_RECALL_TYPE',
  CHECK_YOUR_ANSWERS = 'CHECK_YOUR_ANSWERS',
  RECALL_ENTRY_SUCCESS = 'RECALL_ENTRY_SUCCESS',
}

export interface PageViewEventDetails {
  who: string
  subjectId?: string
  subjectType?: string
  correlationId?: string
  details?: object
}

export default class AuditService {
  constructor(private readonly hmppsAuditClient: HmppsAuditClient) {}

  async logAuditEvent(event: AuditEvent) {
    await this.hmppsAuditClient.sendMessage(event)
  }

  async logPageView(page: Page, eventDetails: PageViewEventDetails) {
    const event: AuditEvent = {
      ...eventDetails,
      what: `PAGE_VIEW_${page}`,
    }
    await this.hmppsAuditClient.sendMessage(event)
  }
}
