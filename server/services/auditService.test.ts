import { AuditService as HmppsAuditService } from '@ministryofjustice/hmpps-audit-client'
import AuditService, { Page } from './auditService'

describe('Audit service', () => {
  let hmppsAuditService: jest.Mocked<HmppsAuditService>
  let auditService: AuditService

  beforeEach(() => {
    hmppsAuditService = {
      logAuditEvent: jest.fn(),
    } as unknown as jest.Mocked<HmppsAuditService>
    auditService = new AuditService(hmppsAuditService)
  })

  describe('logAuditEvent', () => {
    it('sends audit message using audit client', async () => {
      await auditService.logAuditEvent({
        action: 'AUDIT_EVENT',
        who: 'user1',
        subjectId: 'subject123',
        subjectType: 'PRISONER_ID',
        correlationId: 'request123',
        details: { extraDetails: 'example' },
      })

      expect(hmppsAuditService.logAuditEvent).toHaveBeenCalledWith({
        action: 'AUDIT_EVENT',
        who: 'user1',
        subjectId: 'subject123',
        subjectType: 'PRISONER_ID',
        correlationId: 'request123',
        details: { extraDetails: 'example' },
      })
    })
  })

  describe('logPageView', () => {
    it('sends page view event audit message using audit client', async () => {
      await auditService.logPageView(Page.HOME, {
        who: 'user1',
        subjectId: 'subject123',
        subjectType: 'PRISONER_ID',
        correlationId: 'request123',
        details: { extraDetails: 'example' },
      })

      expect(hmppsAuditService.logAuditEvent).toHaveBeenCalledWith({
        action: 'PAGE_VIEW_HOME',
        who: 'user1',
        subjectId: 'subject123',
        subjectType: 'PRISONER_ID',
        correlationId: 'request123',
        details: { extraDetails: 'example' },
      })
    })
  })
})
