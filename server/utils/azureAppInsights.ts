import { flushTelemetry, initialiseTelemetry, telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import type { RequestHandler } from 'express'

initialiseTelemetry({
  serviceName: 'hmpps-record-a-recall',
  serviceVersion: process.env.BUILD_NUMBER || 'unknown',
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  debug: process.env.DEBUG_TELEMETRY === 'true',
})
  .addFilter(
    telemetry.processors.filterSpanWherePath(['/health', '/ping', '/info', '/assets/*', '/favicon.ico', '/metrics']),
  )
  .addModifier(telemetry.processors.enrichSpanNameWithHttpRoute())
  .startRecording()

const shutdown = async () => {
  await flushTelemetry()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown())
process.on('SIGINT', () => shutdown())

export default function addUsernameAndCaseloadToTelemetry(): RequestHandler {
  return (req, res, next) => {
    const { username } = res?.locals?.user || {}
    const caseloadId = res?.locals?.prisoner?.prisonId || null

    telemetry.setSpanAttributes({
      ...(username && { username }),
      ...(caseloadId && { caseloadId }),
    })
    return next()
  }
}
