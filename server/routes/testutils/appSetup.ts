import express, { Express } from 'express'
import { NotFound } from 'http-errors'
import { SessionData } from 'express-session'
import { randomUUID } from 'crypto'
import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import type { Services } from '../../services'
import AuditService from '../../services/auditService'
import HmppsAuditClient from '../../data/hmppsAuditClient'
import PrisonerSearchService from '../../services/prisonerSearchService'
import TestData from '../../testutils/testData'
import { HmppsUser } from '../../interfaces/hmppsUser'
import setUpWebSession from '../../middleware/setUpWebSession'
import populateValidationErrors from '../../middleware/populateValidationErrors'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import { ApplicationInfo } from '../../applicationInfo'

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

const testAppInfo: ApplicationInfo = {
  applicationName: 'hmpps-record-a-recall',
  buildNumber: '1',
  gitRef: 'long ref',
  gitShortHash: 'short ref',
  branchName: 'main',
  productId: 'id',
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
  nunjucksSetup(app, testAppInfo)
  app.use(setUpWebSession())
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    req.flash = flashProvider
    res.locals = {
      user: { ...req.user } as HmppsUser,
      cspNonce: '',
      csrfToken: '',
      asset_path: '',
      applicationName: '',
      environmentName: '',
      environmentNameColour: '',
    }
    res.locals.prisoner = {
      firstName: 'JOHN',
      lastName: 'SMITH',
    } as PrisonerSearchApiPrisoner
    next()
  })
  app.use('/person/:nomsId', async (req, res, next) => {
    if (services.prisonerSearchService) {
      try {
        res.locals.prisoner = await (services.prisonerSearchService as PrisonerSearchService).getPrisonerDetails(
          req.params.nomsId,
          res.locals.user.username,
        )
      } catch {
        res.locals.prisoner = TestData.prisoner({ prisonerNumber: req.params.nomsId })
      }
    }
    next()
  })
  app.use((req, _res, next) => {
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
  app.use((_req, _res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {
    auditService: new AuditService({} as HmppsAuditClient) as jest.Mocked<AuditService>,
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
