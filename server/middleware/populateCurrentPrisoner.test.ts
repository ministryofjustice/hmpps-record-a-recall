import type { Request, Response } from 'express'
import populateCurrentPrisoner from './populateCurrentPrisoner'
import PrisonerSearchService from '../services/prisonerSearchService'
import { restoreAndClearSession } from '../data/sessionRecoveryStore'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'

jest.mock('../data/sessionRecoveryStore')

describe('populateCurrentPrisoner', () => {
  const next = jest.fn()
  let prisonerSearchService: jest.Mocked<PrisonerSearchService>

  function createReqRes({
    nomsId,
    username,
    session = {},
  }: {
    nomsId?: string
    username?: string
    session?: Record<string, unknown>
  }) {
    const req = {
      params: nomsId ? { nomsId } : {},
      session,
    } as unknown as Request

    const res = {
      locals: {
        user: username ? { username } : undefined,
      },
    } as unknown as Response

    return { req, res }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    prisonerSearchService = { getPrisonerDetails: jest.fn() } as unknown as jest.Mocked<PrisonerSearchService>
  })

  it('restores previously-saved session progress from Redis once the prisoner is successfully loaded, then clears the Redis entry', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue({ prisonId: 'MDI' } as PrisonerSearchApiPrisoner)
    ;(restoreAndClearSession as jest.Mock).mockResolvedValue({
      recallJourneys: { 'journey-1': { id: 'journey-1' } },
    })

    const { req, res } = createReqRes({ nomsId: 'A1234BC', username: 'user1', session: { recallJourneys: {} } })

    await populateCurrentPrisoner(prisonerSearchService)(req, res, next)

    expect(restoreAndClearSession).toHaveBeenCalledWith('user1', 'A1234BC')
    expect(req.session.recallJourneys).toEqual({ 'journey-1': { id: 'journey-1' } })
    expect(next).toHaveBeenCalledWith()
  })

  it('does not overwrite the new session cookie with the recovered one', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue({ prisonId: 'MDI' } as PrisonerSearchApiPrisoner)
    ;(restoreAndClearSession as jest.Mock).mockResolvedValue({
      cookie: { maxAge: 999 },
      recallJourneys: { 'journey-1': { id: 'journey-1' } },
    })

    const { req, res } = createReqRes({
      nomsId: 'A1234BC',
      username: 'user1',
      session: { cookie: { maxAge: 123 }, recallJourneys: {} },
    })

    await populateCurrentPrisoner(prisonerSearchService)(req, res, next)

    expect(req.session.cookie).toEqual({ maxAge: 123 })
    expect(req.session.recallJourneys).toEqual({ 'journey-1': { id: 'journey-1' } })
  })

  it('leaves the session untouched when there is nothing to recover', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue({ prisonId: 'MDI' } as PrisonerSearchApiPrisoner)
    ;(restoreAndClearSession as jest.Mock).mockResolvedValue(null)

    const { req, res } = createReqRes({
      nomsId: 'A1234BC',
      username: 'user1',
      session: { recallJourneys: { existing: true } },
    })

    await populateCurrentPrisoner(prisonerSearchService)(req, res, next)

    expect(req.session.recallJourneys).toEqual({ existing: true })
  })

  it('skips restoration entirely when nomsId is not present on the route', async () => {
    const { req, res } = createReqRes({ username: 'user1' })

    await populateCurrentPrisoner(prisonerSearchService)(req, res, next)

    expect(restoreAndClearSession).not.toHaveBeenCalled()
    expect(prisonerSearchService.getPrisonerDetails).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })
})
