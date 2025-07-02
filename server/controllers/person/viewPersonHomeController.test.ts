import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import viewPersonHome from './viewPersonHomeController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import { RecallType } from '../../@types/recallTypes'
import HmppsAuthClient from '../../data/hmppsAuthClient'
import AuditService from '../../services/auditService'
import PrisonerService from '../../services/prisonerService'
import RecallService from '../../services/recallService'
import PrisonService from '../../services/PrisonService'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import CalculationService from '../../services/calculationService'
import FeComponentsService from '../../services/feComponentsService'
import BulkCalculationService from '../../services/bulkCalculationService'
import CourtCaseService from '../../services/CourtCaseService'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import CourtService from '../../services/CourtService'
import AdjustmentsService from '../../services/adjustmentsService'
import ManageUsersService from '../../services/manageUsersService'
import ManageOffencesService from '../../services/manageOffencesService'
import NomisToDpsMappingService from '../../services/NomisToDpsMappingService'

const mockHmppsAuthClient = { getSystemClientToken: jest.fn() } as unknown as HmppsAuthClient

const mockRecallService = {
  hmppsAuthClient: mockHmppsAuthClient,
  getAllRecalls: jest.fn(),
  getRecall: jest.fn(),
  postRecall: jest.fn(),
  updateRecall: jest.fn(),
  deleteRecall: jest.fn(),
  getRecallDocument: jest.fn(),
  getRecallDocumentHistory: jest.fn(),
  setRecallDocument: jest.fn(),
  getApiClient: jest.fn(),
  getSystemClientToken: jest.fn(),
  fromApiRecall: jest.fn(),
} as unknown as RecallService
const mockPrisonerService = {
  hmppsAuthClient: mockHmppsAuthClient,
  getPrisonerDetails: jest.fn(),
  getPrisonersInEstablishment: jest.fn(),
  getPrisonerImage: jest.fn(),
  getSystemClientToken: jest.fn(),
} as unknown as PrisonerService
const mockPrisonService = {
  hmppsAuthClient: mockHmppsAuthClient,
  getPrisonNames: jest.fn(),
  getPrisonName: jest.fn(),
  getApiClient: jest.fn(),
  getSystemClientToken: jest.fn(),
} as unknown as PrisonService
const mockCourtCasesReleaseDatesService = {
  getServiceDefinitions: jest.fn(),
} as unknown as CourtCasesReleaseDatesService

const mockApplicationInfo = {
  applicationName: 'test-app',
  buildNumber: '1',
  gitRef: 'abc',
  gitShortHash: 'abcdef',
  branchName: 'main',
}
const mockAuditService = {
  logAuditEvent: jest.fn(),
  logPageView: jest.fn(),
} as unknown as AuditService
const mockCalculationService = { calculate: jest.fn() } as unknown as CalculationService
const mockFeComponentsService = { getComponent: jest.fn() } as unknown as FeComponentsService
const mockGotenbergService = { convert: jest.fn() }
const mockPersonSearchService = { search: jest.fn() }
const mockPpcsService = { getDetails: jest.fn() }
const mockPrisonerOffenderSearchService = { search: jest.fn() }
const mockNomisToDpsMappingService = { getMapping: jest.fn() } as unknown as NomisToDpsMappingService
const mockBulkCalculationService = {} as unknown as BulkCalculationService
const mockCourtCaseService = {} as unknown as CourtCaseService
const mockCourtService = {} as unknown as CourtService
const mockAdjustmentsService = {} as unknown as AdjustmentsService
const mockManageUsersService = {} as unknown as ManageUsersService
const mockManageOffencesService = { getOffenceMap: jest.fn() } as unknown as ManageOffencesService

interface TestServices {
  recallService: typeof mockRecallService
  prisonerService: typeof mockPrisonerService
  prisonService: typeof mockPrisonService
  courtCasesReleaseDatesService: typeof mockCourtCasesReleaseDatesService
  applicationInfo: typeof mockApplicationInfo
  auditService: typeof mockAuditService
  calculationService: typeof mockCalculationService
  feComponentsService: typeof mockFeComponentsService
  gotenbergService: typeof mockGotenbergService
  personSearchService: typeof mockPersonSearchService
  ppcsService: typeof mockPpcsService
  prisonerOffenderSearchService: typeof mockPrisonerOffenderSearchService
  nomisMappingService: typeof mockNomisToDpsMappingService
  bulkCalculationService: typeof mockBulkCalculationService
  courtCaseService: typeof mockCourtCaseService
  courtService: typeof mockCourtService
  adjustmentsService: typeof mockAdjustmentsService
  manageUsersService: typeof mockManageUsersService
  manageOffencesService: typeof mockManageOffencesService
}

let req: Partial<Request>
let res: Partial<Response>

const createMockRecall = (recallId: string, createdAtArg: string | null): Recall =>
  ({
    recallId,
    nomisNumber: 'A1234BC',
    status: 'BEING_BOOKED_ON',
    documents: [],
    createdAt: createdAtArg as string,
    created_by_username: 'DPS',
    revocationDate: new Date('2023-01-01'),
    returnToCustodyDate: new Date('2023-01-02'),
    recallType: {
      code: 'LR',
      name: 'Licence Revocation',
      description: 'Licence Revocation Recall',
      fixedTerm: false,
    } as RecallType,
    isFixedTermRecall: false,
    location: 'KMI',
    sentenceIds: [],
    courtCaseIds: [],
  }) as Recall

const createMockRecallFromNomis = (recallId: string, createdAtArg: string | null): Recall =>
  ({
    recallId,
    nomisNumber: 'Z1234BC',
    status: 'BEING_BOOKED_ON',
    documents: [],
    createdAt: createdAtArg as string,
    created_by_username: 'hmpps-prisoner-from-nomis-migration-court-sentencing-1',
    revocationDate: new Date('2023-01-01'),
    returnToCustodyDate: new Date('2023-01-02'),
    recallType: {
      code: 'LR',
      name: 'Licence Revocation',
      description: 'Licence Revocation Recall',
      fixedTerm: false,
    } as RecallType,
    isFixedTermRecall: false,
    location: 'KMI',
    sentenceIds: [],
    courtCaseIds: [],
  }) as Recall

describe('viewPersonHome', () => {
  beforeEach(async () => {
    jest.resetAllMocks()

    const mockCaseload = {
      id: 'MDI',
      name: 'Moorland',
      type: 'INST',
      currentlyActive: true,
    }
    const user = {
      username: 'test_user',
      token: 'test_token',
      name: 'Test User',
      authSource: 'azuread' as const,
      userId: 'TEST_USER_ID',
      activeCaseload: mockCaseload,
      caseloads: [mockCaseload],
      userRoles: [] as string[],
      displayName: 'Test User',
    }

    res = {
      locals: {
        nomisId: 'A1234BC',
        user,
      },
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    }

    req = {
      params: { nomsNumber: 'A1234BC' },
      flash: jest.fn().mockReturnValue([]),
      user,
      services: {
        recallService: mockRecallService,
        prisonerService: mockPrisonerService,
        prisonService: mockPrisonService,
        courtCasesReleaseDatesService: mockCourtCasesReleaseDatesService,
        applicationInfo: mockApplicationInfo,
        auditService: mockAuditService,
        calculationService: mockCalculationService,
        feComponentsService: mockFeComponentsService,
        gotenbergService: mockGotenbergService,
        personSearchService: mockPersonSearchService,
        ppcsService: mockPpcsService,
        prisonerOffenderSearchService: mockPrisonerOffenderSearchService,
        nomisMappingService: mockNomisToDpsMappingService,
        bulkCalculationService: mockBulkCalculationService,
        courtCaseService: mockCourtCaseService,
        courtService: mockCourtService,
        adjustmentsService: mockAdjustmentsService,
        manageUsersService: mockManageUsersService,
        manageOffencesService: mockManageOffencesService,
      } as TestServices,
    }
    ;(mockPrisonerService.getPrisonerDetails as jest.Mock).mockResolvedValue({
      prisonerNumber: 'A1234BC',
      pncNumber: '123/PNC',
      croNumber: '456/CRO',
      bookingId: 'BOOK123',
      bookNumber: 'BOOKNO456',
      firstName: 'TestFirstName',
      middleNames: 'TestMiddleName',
      lastName: 'TestLastName',
      dateOfBirth: '1980-01-01',
      gender: 'Male',
      ethnicity: 'White',
      youthOffender: false,
      maritalStatus: 'Single',
      religion: 'None',
      nationality: 'British',
      status: 'ACTIVE IN',
      lastMovementTypeCode: 'ADM',
      lastMovementReasonCode: 'INT',
      inOutStatus: 'IN',
      prisonId: 'MDI',
      prisonName: 'Moorland Prison',
      cellLocation: '1-2-003',
      aliases: [],
      alerts: [],
      csra: 'STANDARD',
      legalStatus: 'SENTENCED',
      imprisonmentStatus: 'SENT',
      imprisonmentStatusDescription: 'Sentenced',
      mostRecentPrisonerNumber: 'A1234BC',
      recall: false,
      mostSeriousOffence: 'Robbery',
      restrictedPatient: false,
    } as PrisonerSearchApiPrisoner)
    ;(mockRecallService.getAllRecalls as jest.Mock).mockResolvedValue([])
    ;(mockCourtCasesReleaseDatesService.getServiceDefinitions as jest.Mock).mockResolvedValue(
      {} as CalculatedReleaseDates,
    )
    ;(mockPrisonService.getPrisonNames as jest.Mock).mockResolvedValue(new Map())
  })

  it('should render home page with latestRecallId when there are multiple recalls', async () => {
    const recalls = [
      createMockRecall('recall-1', '2023-01-01T10:00:00.000Z'),
      createMockRecall('recall-2', '2023-01-03T12:00:00.000Z'), // Latest
      createMockRecall('recall-3', '2023-01-02T11:00:00.000Z'),
    ]

    // Simulate data pre-loaded by createDataMiddleware
    res.locals.prisoner = {
      prisonerNumber: 'A1234BC',
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
    }
    res.locals.recalls = recalls
    res.locals.latestRecallId = 'recall-2'
    res.locals.serviceDefinitions = {}

    await viewPersonHome(req as Request, res as Response)

    expect(res.render).toHaveBeenCalledWith(
      'pages/person/home',
      expect.objectContaining({
        latestRecallId: 'recall-2',
        recalls,
      }),
    )
  })

  it('should render home page with latestRecallId when there is only one recall', async () => {
    const recalls = [createMockRecall('recall-single', '2023-02-01T10:00:00.000Z')]

    // Simulate data pre-loaded by createDataMiddleware
    res.locals.prisoner = {
      prisonerNumber: 'A1234BC',
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
    }
    res.locals.recalls = recalls
    res.locals.latestRecallId = 'recall-single'
    res.locals.serviceDefinitions = {}

    await viewPersonHome(req as Request, res as Response)

    expect(res.render).toHaveBeenCalledWith(
      'pages/person/home',
      expect.objectContaining({
        latestRecallId: 'recall-single',
        recalls,
      }),
    )
  })

    
it('should render home page with nomisRecallId when there is only one recall and it is from nomis', async () => {
  const recalls = [createMockRecallFromNomis('recall-single', '2023-02-01T10:00:00.000Z')]

  // Simulate data pre-loaded by createDataMiddleware
  res.locals.prisoner = {
    prisonerNumber: 'Z1234BC',
    firstName: 'TestFirstName',
    lastName: 'TestLastName',
  }
  res.locals.recalls = recalls
  res.locals.latestRecallId = 'recall-single'
  res.locals.recall = { created_by_username: 'hmpps-prisoner-from-nomis-migration-court-sentencing-1' }
  res.locals.serviceDefinitions = {}

  await viewPersonHome(req as Request, res as Response)

  expect(res.render).toHaveBeenCalledWith(
    'pages/person/home',
    expect.objectContaining({
      latestRecallId: 'recall-single',
      recalls: expect.arrayContaining([
        expect.objectContaining({
          created_by_username: 'hmpps-prisoner-from-nomis-migration-court-sentencing-1',
        }),
      ]),
    }),
  )
}) 



  it('should render home page with latestRecallId as undefined when there are no recalls', async () => {
    // Simulate data pre-loaded by createDataMiddleware
    res.locals.prisoner = {
      prisonerNumber: 'A1234BC',
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
    }
    res.locals.recalls = []
    res.locals.latestRecallId = undefined
    res.locals.serviceDefinitions = {}

    await viewPersonHome(req as Request, res as Response)

    expect(res.render).toHaveBeenCalledWith(
      'pages/person/home',
      expect.objectContaining({
        latestRecallId: undefined,
        recalls: [],
      }),
    )
  })

  it('should handle recalls with null createdAt dates correctly when determining latest recall', async () => {
    const recalls = [
      createMockRecall('recall-A', '2023-03-01T10:00:00.000Z'),
      createMockRecall('recall-B', null),
      createMockRecall('recall-C', '2023-02-01T10:00:00.000Z'),
    ]

    // Simulate data pre-loaded by createDataMiddleware
    res.locals.prisoner = {
      prisonerNumber: 'A1234BC',
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
    }
    res.locals.recalls = recalls
    res.locals.latestRecallId = 'recall-A'
    res.locals.serviceDefinitions = {}

    await viewPersonHome(req as Request, res as Response)

    expect(res.render).toHaveBeenCalledWith(
      'pages/person/home',
      expect.objectContaining({
        latestRecallId: 'recall-A',
      }),
    )
  })

  it('should handle all recalls having null createdAt dates', async () => {
    const recalls = [createMockRecall('recall-X', null), createMockRecall('recall-Y', null)]

    // Simulate data pre-loaded by createDataMiddleware
    res.locals.prisoner = {
      prisonerNumber: 'A1234BC',
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
    }
    res.locals.recalls = recalls
    res.locals.latestRecallId = 'recall-X'
    res.locals.serviceDefinitions = {}

    await viewPersonHome(req as Request, res as Response)

    expect(res.render).toHaveBeenCalledWith(
      'pages/person/home',
      expect.objectContaining({
        latestRecallId: 'recall-X',
      }),
    )
  })
})
