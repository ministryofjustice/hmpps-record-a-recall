import { AuditEvent, AuditService as HmppsAuditService } from '@ministryofjustice/hmpps-audit-client'

export enum Page {
  HOME = 'HOME',
  START_CREATE_RECALL = 'START_CREATE_RECALL',
  START_EDIT_RECALL = 'START_EDIT_RECALL',
  ENTER_REVOCATION_DATE = 'ENTER_REVOCATION_DATE',
  ENTER_RETURN_TO_CUSTODY_DATE = 'ENTER_RETURN_TO_CUSTODY_DATE',
  DECISION = 'DECISION',
  REVIEW_SENTENCES_AUTOMATED = 'REVIEW_SENTENCES_AUTOMATED',
  CRITICAL_VALIDATION_INTERCEPT = 'CRITICAL_VALIDATION_INTERCEPT',
  CONFLICTING_ADJUSTMENTS_INTERCEPT = 'CONFLICTING_ADJUSTMENTS_INTERCEPT',
  NO_RECALLABLE_SENTENCES_INTERCEPT = 'NO_RECALLABLE_SENTENCES_INTERCEPT',
  UNEXPECTED_RECALL_TYPE_INTERCEPT = 'UNEXPECTED_RECALL_TYPE_INTERCEPT',
  UNSUPPORTED_RECALL_TYPE_INTERCEPT = 'UNSUPPORTED_RECALL_TYPE_INTERCEPT',
  UNKNOWN_PRE_RECALL_SENTENCE_TYPE_INTERCEPT = 'UNKNOWN_PRE_RECALL_SENTENCE_TYPE_INTERCEPT',
  CONFIRMATION = 'CONFIRMATION',
  CHECK_ANSWERS = 'CHECK_ANSWERS',
  RECALL_TYPE = 'RECALL_TYPE',
  MANUAL_INTERCEPT = 'MANUAL_INTERCEPT',
  MANUAL_SKIP_START_INTERCEPT = 'MANUAL_SKIP_START_INTERCEPT',
  MANUAL_SELECT_CASES = 'MANUAL_SELECT_CASES',
  MANUAL_CHECK_SENTENCES = 'MANUAL_CHECK_SENTENCES',
  CONFIRM_DELETE_RECALL = 'CONFIRM_DELETE_RECALL',
  CANCEL = 'CANCEL',
  NO_CASES_SELECTED = 'NO_CASES_SELECTED',
  NO_SENTENCES_INTERCEPT = 'NO_SENTENCES_INTERCEPT',
}

export interface PageViewEventDetails {
  who: string
  subjectId?: string
  subjectType?: AuditEvent['subjectType']
  correlationId?: string
  details?: Record<string, unknown>
}

export default class AuditService {
  constructor(private readonly hmppsAuditService: HmppsAuditService) {}

  async logAuditEvent(event: AuditEvent) {
    await this.hmppsAuditService.logAuditEvent(event)
  }

  async logPageView(page: Page, eventDetails: PageViewEventDetails) {
    await this.hmppsAuditService.logAuditEvent({
      ...eventDetails,
      action: `PAGE_VIEW_${page}`,
    })
  }

  async logHomePageViewEvent(
    username: string,
    nomsId: string,
    correlationId: string,
    identifiers: {
      recallIds: string[]
      courtCaseUuids: string[]
      sentenceUuids: string[]
      periodLengthUuids: string[]
    },
  ) {
    const auditDetails = {
      ...identifiers,
      time: Date.now(),
    }

    await this.hmppsAuditService.logAuditEvent({
      who: username,
      action: 'PAGE_VIEW_HOME',
      subjectId: nomsId,
      subjectType: 'PRISONER_ID',
      correlationId,
      details: auditDetails,
    })
  }

  async logCreateRecallEvent(
    username: string,
    nomsId: string,
    correlationId: string,
    identifiers: {
      recallId: string
      sentenceUuids: string[]
    },
  ) {
    await this.logRecallEvent('ADD_RECALL', username, nomsId, correlationId, identifiers)
  }

  async logEditRecallEvent(
    username: string,
    nomsId: string,
    correlationId: string,
    identifiers: {
      recallId: string
      sentenceUuids: string[]
    },
  ) {
    await this.logRecallEvent('EDIT_RECALL', username, nomsId, correlationId, identifiers)
  }

  async logDeleteRecallEvent(
    username: string,
    nomsId: string,
    correlationId: string,
    identifiers: {
      recallId: string
    },
  ) {
    await this.logRecallEvent('DELETE_RECALL', username, nomsId, correlationId, identifiers)
  }

  private async logRecallEvent(
    action: 'ADD_RECALL' | 'EDIT_RECALL' | 'DELETE_RECALL',
    username: string,
    nomsId: string,
    correlationId: string,
    identifiers: object,
  ) {
    await this.hmppsAuditService.logAuditEvent({
      who: username,
      action,
      subjectId: nomsId,
      subjectType: 'PRISONER_ID',
      correlationId,
      details: {
        ...identifiers,
        time: Date.now(),
      },
    })
  }
}
