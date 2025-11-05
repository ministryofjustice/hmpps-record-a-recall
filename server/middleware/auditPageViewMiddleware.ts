import { RequestHandler } from 'express'
import { AuditEvent } from '../data/hmppsAuditClient'
import AuditService, { Page } from '../services/auditService'

const auditPageViewMiddleware = (page: Page, auditService: AuditService): RequestHandler => {
  const PRISON_NUMBER_REGEX = /person\/([0-9A-z]+)/

  return async (req, res, next) => {
    res.prependOnceListener('close', async () => {
      const personIdentifier = req.originalUrl.match(PRISON_NUMBER_REGEX)?.[1]
      if (res.statusCode < 400) {
        await auditService.logPageView(page, {
          who: res.locals.user.username,
          subjectId: personIdentifier,
          subjectType: 'PERSON',
          correlationId: req.id,
          details: {
            url: req.originalUrl,
            statusCode: res.statusCode,
            prisonNumber: personIdentifier,
          },
        })
      } else {
        let auditEventName: string | undefined
        if ([401, 403, 404].includes(res.statusCode)) {
          auditEventName = 'UNAUTHORISED_PAGE_VIEW'
        } else if (res.statusCode >= 500 && res.statusCode <= 599) {
          auditEventName = 'FAILED_PAGE_VIEW'
        }
        if (auditEventName) {
          const event: AuditEvent = {
            what: auditEventName,
            who: res.locals.user.username,
            correlationId: req.id,
            details: {
              url: req.originalUrl,
              statusCode: res.statusCode,
            },
          }
          if (personIdentifier) {
            if (!event.subjectType) {
              event.subjectType = 'PERSON'
              event.subjectId = personIdentifier
            }
            event.details = {
              ...event.details,
              prisonNumber: personIdentifier,
              page,
            }
          }
          await auditService.logAuditEvent(event)
        }
      }
    })
    next()
  }
}

export default auditPageViewMiddleware
