import express, { Express } from 'express'
import { NotFound } from 'http-errors'
import { SessionData } from 'express-session'
import { randomUUID } from 'crypto'
import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import type { Services } from '../../services'
import AuditService from '../../services/auditService'
import { HmppsUser } from '../../interfaces/hmppsUser'
import setUpWebSession from '../../middleware/setUpWebSession'
import populateValidationErrors from '../../middleware/populateValidationErrors'

jest.mock('../../services/auditService')

export const user: HmppsUser = {
  name: 'FIRST LAST',
  userId: 'id',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  authSource: 'nomis',
  staffId: 1234,
  userRoles: [],
  caseLoads: [
    {
      caseLoadId: 'MDI',
      description: 'mdi prison',
      type: 'INST',
      currentlyActive: true,
    },
  ],
  activeCaseLoadId: 'MDI',
  hasAdjustmentsAccess: false,
}

export const flashProvider = jest.fn()

function appSetup(
  services: Services,
  production: boolean,
  userSupplier: () => HmppsUser,
  sessionReceiver?: (session: Partial<SessionData>) => void,
): Express {
  const app = express()

  app.set('view engine', 'njk')
  flashProvider.mockImplementation(_ => [])
  nunjucksSetup(app)
  app.use(setUpWebSession())
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    req.flash = flashProvider
    res.locals = {
      user: { ...req.user } as HmppsUser,
    }
    next()
  })
  app.use((req, res, next) => {
    req.id = randomUUID()
    next()
  })
  app.use((req, res, next) => {
    if (sessionReceiver) sessionReceiver(req.session)
    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(populateValidationErrors())
  app.use(routes(services))
  app.use((req, res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {
    auditService: new AuditService(null) as jest.Mocked<AuditService>,
  },
  userSupplier = () => user,
  sessionReceiver = undefined,
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => HmppsUser
  sessionReceiver?: (session: Partial<SessionData>) => void
}): Express {
  return appSetup(services as Services, production, userSupplier, sessionReceiver)
}
