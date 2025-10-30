import HmppsAuditClient, { AuditEvent } from '../data/hmppsAuditClient'

export enum Page {
  HOME = 'HOME',
  START_CREATE_RECALL = 'START_CREATE_RECALL',
  CREATE_RECALL_ENTER_REVOCATION_DATE = 'CREATE_RECALL_ENTER_REVOCATION_DATE',
  CREATE_RECALL_ENTER_RETURN_TO_CUSTODY_DATE = 'CREATE_RECALL_ENTER_RETURN_TO_CUSTODY_DATE',
  CREATE_RECALL_DECISION = 'CREATE_RECALL_DECISION',
  CREATE_RECALL_MANUAL_INTERCEPT = 'CREATE_RECALL_MANUAL_INTERCEPT',
  CREATE_RECALL_CHECK_SENTENCES = 'CREATE_RECALL_CHECK_SENTENCES',
  CREATE_RECALL_MANUAL_SELECT_CASES = 'CREATE_RECALL_MANUAL_SELECT_CASES',
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
