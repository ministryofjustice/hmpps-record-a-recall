import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall, UAL } from 'models'
import { getDeleteRecallConfirmation, postDeleteRecallConfirmation } from './deleteRecallController'
import { PrisonerSearchApiPrisoner as Prisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import { HmppsUser } from '../../interfaces/hmppsUser'
import { RecallTypes } from '../../@types/recallTypes'
import HmppsAuthClient from '../../data/hmppsAuthClient'
import RecallService from '../../services/recallService'
import PrisonerService from '../../services/prisonerService'

interface DeleteRecallTestRequest {
  params: { nomisId: string; recallId: string }
  query: { from?: string }
  body: { confirmDelete?: string; fromPage?: string }
  user: HmppsUser
  services: {
    recallService: RecallService
    prisonerService: PrisonerService
  }
  flash: jest.Mock
}

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

describe('deleteRecallController', () => {
  let req: DeleteRecallTestRequest
  let res: Partial<Response>
  const nomisId = 'A1234BC'
  const recallId = 'RECALL_UUID_123'
  const user = { username: 'testUser', token: 'token', name: 'Test User' } as HmppsUser

  const mockApiRecall: Recall = {
    recallId,
    createdAt: new Date('2023-10-26T10:00:00.000Z').toISOString(),
    revocationDate: new Date('2023-10-01'),
    returnToCustodyDate: new Date('2023-10-02'),
    recallType: RecallTypes.STANDARD_RECALL,
    ual: {
      firstDay: new Date('2023-09-28').toISOString(),
      lastDay: new Date('2023-10-02').toISOString(),
      days: 5,
    } as UAL,
    ualString: '5 days',
    location: 'MDI',
    sentenceIds: ['SENTENCE_UUID_1'],
    courtCaseIds: ['COURT_CASE_UUID_1'],
    isFixedTermRecall: false,
  }

  const mockApiPrisoner: Prisoner = {
    prisonerNumber: nomisId,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-01-01',
    pncNumber: 'PNC123',
    croNumber: 'CRO456',
    bookingId: 'BOOKING789',
    status: 'ACTIVE IN',
    prisonId: 'MDI',
    prisonName: 'Moorland Prison',
    cellLocation: '1-1-001',
    legalStatus: 'SENTENCED',
    recall: false,
    gender: 'Male',
    ethnicity: 'White British',
    receptionDate: '2020-01-01',
    releaseDate: '2025-01-01',
    conditionalReleaseDate: '2024-01-01',
    homeDetentionCurfewEligibilityDate: '2023-01-01',
    licenceExpiryDate: '2025-06-01',
    topupSupervisionExpiryDate: '2026-01-01',
    sentenceStartDate: '2020-01-10',
    sentenceExpiryDate: '2025-01-09',
    nonDtoReleaseDateType: 'CRD',
    confirmedReleaseDate: '2024-01-01',
    lastMovementTypeCode: 'ADM',
    lastMovementReasonCode: 'I',
    inOutStatus: 'IN',
    restrictedPatient: false,
    supportingPrisonId: 'MDI',
    dischargedHospitalId: undefined,
    dischargedHospitalDescription: undefined,
    dischargeDate: undefined,
    dischargeDetails: undefined,
    youthOffender: false,
    maritalStatus: 'Single',
    religion: 'None',
    nationality: 'British',
    mostSeriousOffence: 'Theft',
  }

  beforeEach(() => {
    jest.resetAllMocks()
    req = {
      params: { nomisId, recallId },
      body: {},
      query: {},
      user,
      services: {
        recallService: mockRecallService,
        prisonerService: mockPrisonerService,
      },
      flash: jest.fn(),
    } as unknown as DeleteRecallTestRequest
    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      locals: { user },
    }
  })

  describe('getDeleteRecallConfirmation', () => {
    it('should fetch recall and prisoner details and render confirmation page', async () => {
      ;(mockRecallService.getRecall as jest.Mock).mockResolvedValue(mockApiRecall)
      ;(mockPrisonerService.getPrisonerDetails as jest.Mock).mockResolvedValue(mockApiPrisoner)

      req.query.from = 'overview'
      await getDeleteRecallConfirmation(req as unknown as Request, res as Response)

      expect(mockRecallService.getRecall).toHaveBeenCalledWith(recallId, user.username)
      expect(mockPrisonerService.getPrisonerDetails).toHaveBeenCalledWith(nomisId, user.username)
      expect(res.render).toHaveBeenCalledWith('pages/recall/delete-confirmation.njk', {
        nomisId,
        recall: mockApiRecall,
        prisoner: mockApiPrisoner,
        fromPage: 'overview',
        backLink: `/person/${nomisId}`,
      })
    })

    it('should handle error if getRecall fails', async () => {
      ;(mockRecallService.getRecall as jest.Mock).mockRejectedValue(new Error('API error'))

      try {
        await getDeleteRecallConfirmation(req as unknown as Request, res as Response)
      } catch (e) {
        expect(e.message).toBe('API error')
      }
      expect(mockPrisonerService.getPrisonerDetails).not.toHaveBeenCalled()
      expect(res.render).not.toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalled()
    })
  })

  describe('postDeleteRecallConfirmation', () => {
    it('should delete recall and redirect with success flash if "yes" is confirmed', async () => {
      req.body.confirmDelete = 'yes'
      req.body.fromPage = 'overview'
      ;(mockRecallService.deleteRecall as jest.Mock).mockResolvedValue(undefined)

      await postDeleteRecallConfirmation(req as unknown as Request, res as Response)

      expect(mockRecallService.deleteRecall).toHaveBeenCalledWith(nomisId, recallId, user.username)
      expect(req.flash).not.toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith(`/person/${nomisId}`)
    })

    it('should redirect without deleting if "no" is confirmed', async () => {
      req.body.confirmDelete = 'no'
      req.body.fromPage = 'overview'

      await postDeleteRecallConfirmation(req as unknown as Request, res as Response)

      expect(mockRecallService.deleteRecall).not.toHaveBeenCalled()
      expect(req.flash).not.toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith(`/person/${nomisId}`)
    })

    it('should redirect without deleting if confirmation is missing', async () => {
      req.body.fromPage = 'overview'
      ;(mockRecallService.getRecall as jest.Mock).mockResolvedValue(mockApiRecall)
      ;(mockPrisonerService.getPrisonerDetails as jest.Mock).mockResolvedValue(mockApiPrisoner)

      await postDeleteRecallConfirmation(req as unknown as Request, res as Response)

      expect(mockRecallService.deleteRecall).not.toHaveBeenCalled()
      expect(req.flash).not.toHaveBeenCalled()
      expect(res.render).toHaveBeenCalledWith('pages/recall/delete-confirmation.njk', {
        nomisId,
        recall: mockApiRecall,
        prisoner: mockApiPrisoner,
        errors: [
          { text: 'Select if you are sure you want to delete the recall', href: '#delete-yes', name: 'confirmDelete' },
        ],
        fromPage: 'overview',
        backLink: `/person/${nomisId}`,
      })
      expect(res.redirect).not.toHaveBeenCalled()
    })

    it('should handle error if deleteRecall fails', async () => {
      req.body.confirmDelete = 'yes'
      ;(mockRecallService.deleteRecall as jest.Mock).mockRejectedValue(new Error('API delete error'))

      try {
        await postDeleteRecallConfirmation(req as unknown as Request, res as Response)
      } catch (e) {
        expect(e.message).toBe('API delete error')
      }
      expect(req.flash).not.toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalledWith(expect.stringContaining('success'))
    })
  })
})
