import express, { Express } from 'express'
import { NotFound } from 'http-errors'
import { v4 as uuidv4 } from 'uuid'

import cookieSession from 'cookie-session'
import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import * as auth from '../../authentication/auth'
import type { Services } from '../../services'
import type { ApplicationInfo } from '../../applicationInfo'
import AuditService from '../../services/auditService'
import { HmppsUser } from '../../interfaces/hmppsUser'

jest.mock('../../services/auditService')

const testAppInfo: ApplicationInfo = {
  applicationName: 'test',
  buildNumber: '1',
  gitRef: 'long ref',
  gitShortHash: 'short ref',
  branchName: 'main',
}

export const user: HmppsUser = {
  name: 'FIRST LAST',
  userId: 'id',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  authSource: 'nomis',
  staffId: 1234,
  userRoles: [],
  caseloads: [],
  activeCaseload: { id: 'TSI', name: 'HM Test' },
}

function appSetup(
  services: Services,
  production: boolean,
  userSupplier: () => HmppsUser,
  flashProvider = jest.fn(),
): Express {
  const app = express()

  app.set('view engine', 'njk')

  nunjucksSetup(app, testAppInfo)
  app.use(cookieSession({ keys: [''] }))
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    req.flash = flashProvider
    res.locals = {
      user: { ...req.user } as HmppsUser,
      prisoner: { bookingId: 91119 },
    }
    next()
  })
  app.use((req, res, next) => {
    req.id = uuidv4()
    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(routes(services))
  app.use((req, res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {},
  userSupplier = () => user,
  flashProvider = jest.fn(),
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => HmppsUser
  flashProvider?: jest.Mock<unknown, [string]>
}): Express {
  // Always provide default mocks for required services
  const defaultServices = {
    auditService: new AuditService(null) as jest.Mocked<AuditService>,
  }

  // Merge provided services with defaults
  const mergedServices = { ...defaultServices, ...services }

  auth.default.authenticationMiddleware = () => (req, res, next) => next()
  return appSetup(mergedServices as Services, production, userSupplier, flashProvider)
}
