import nock from 'nock'
import RecallService from './recallService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { RecallTypes } from '../@types/recallTypes'
import logger from '../../logger'
import { formatDate } from '../utils/utils'
import AdjustmentsService from './adjustmentsService'

jest.mock('../data/hmppsAuthClient')
jest.mock('./adjustmentsService')

describe('Recall service', () => {
  let fakeRemandAndSentencingApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let adjustmentsService: jest.Mocked<AdjustmentsService>
  let recallService: RecallService

  beforeEach(() => {
    fakeRemandAndSentencingApi = nock(config.apis.remandAndSentencingApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
    recallService = new RecallService(hmppsAuthClient, adjustmentsService)
  })

  describe('createRecall', () => {
    it('Should construct post request correctly when creating a recall', async () => {
      const nomsId = 'A1234BC'
      const recallToCreate: CreateRecall = {
        prisonerId: nomsId,
        revocationDate: formatDate(new Date(2024, 0, 1)),
        returnToCustodyDate: formatDate(new Date(2024, 3, 2)),
        recallTypeCode: 'LR',
        createdByUsername: 'user11',
        createdByPrison: 'HMI',
      }

      fakeRemandAndSentencingApi
        .post('/recall', {
          prisonerId: nomsId,
          revocationDate: '2024-01-01',
          returnToCustodyDate: '2024-04-02',
          recallTypeCode: 'LR',
          createdByUsername: 'user11',
          createdByPrison: 'HMI',
        })
        .reply(200, { recallUuid: 'uuid-returned' } as CreateRecallResponse)

      const recall = await recallService.postRecall(recallToCreate, 'user11')

      expect(recall.recallUuid).toEqual('uuid-returned')
    })
  })

  describe('getAllRecalls', () => {
    it('Should return all recalls from api correctly', async () => {
      const nomsId = 'A1234BC'

      fakeRemandAndSentencingApi.get(`/recall/person/${nomsId}`).reply(200, [
        {
          recallUuid: '1234567',
          prisonerId: 'ABC12345',
          revocationDate: '2023-06-15',
          returnToCustodyDate: '2023-06-20',
          recallType: 'FTR_14',
          createdAt: '2023-06-10T14:30:00Z',
          createdByUsername: 'johndoe',
          createdByPrison: 'HMI',
          sentences: [{ sentenceUuid: '123ABC' }],
          courtCaseIds: ['CASE1'],
        } as ApiRecall,
      ])

      const recalls = await recallService.getAllRecalls(nomsId, 'user001')

      expect(recalls).toEqual([
        {
          recallId: '1234567',
          revocationDate: new Date('2023-06-15T00:00:00.000Z'),
          returnToCustodyDate: new Date('2023-06-20T00:00:00.000Z'),
          recallType: RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL,
          ual: {
            days: 4,
            firstDay: new Date('2023-06-16T00:00:00.000Z'),
            lastDay: new Date('2023-06-19T00:00:00.000Z'),
          },
          ualString: '4 days',
          createdAt: '2023-06-10T14:30:00Z',
          location: 'HMI',
          sentenceIds: ['123ABC'],
          courtCaseIds: ['CASE1'],
          created_by_username: 'johndoe',
          sentences: [{ sentenceUuid: '123ABC' }],
        },
      ])
    })
  })

  describe('deleteRecall', () => {
    const nomisId = 'A1234BC'
    const recallId = 'recall-uuid-123'
    const username = 'userTest1'

    let loggerErrorSpy: jest.SpyInstance

    beforeEach(() => {
      adjustmentsService.searchUal = jest.fn()
      adjustmentsService.deleteAdjustment = jest.fn()
      loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      loggerErrorSpy.mockRestore()
    })

    it('should delete recall and not attempt to delete UALs if none are found', async () => {
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).reply(200)
      adjustmentsService.searchUal = jest.fn().mockResolvedValue([])
      adjustmentsService.deleteAdjustment = jest.fn()

      await recallService.deleteRecall(nomisId, recallId, username)

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).toHaveBeenCalledWith(nomisId, username, recallId)
      expect(adjustmentsService.deleteAdjustment).not.toHaveBeenCalled()
    })

    it('should delete recall, find one UAL, and delete it successfully', async () => {
      const ualAdjustment = { id: 'ual-uuid-1', person: nomisId, recallId }
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).reply(200)
      adjustmentsService.searchUal = jest.fn().mockResolvedValue([ualAdjustment])
      adjustmentsService.deleteAdjustment = jest.fn().mockResolvedValue(undefined)

      await recallService.deleteRecall(nomisId, recallId, username)

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).toHaveBeenCalledWith(nomisId, username, recallId)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledWith(ualAdjustment.id, username)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledTimes(1)
    })

    it('should delete recall, find multiple UALs, and delete them all successfully', async () => {
      const ualAdjustments = [
        { id: 'ual-uuid-1', person: nomisId, recallId },
        { id: 'ual-uuid-2', person: nomisId, recallId },
      ]
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).reply(200)
      adjustmentsService.searchUal = jest.fn().mockResolvedValue(ualAdjustments)
      adjustmentsService.deleteAdjustment = jest.fn().mockResolvedValue(undefined)

      await recallService.deleteRecall(nomisId, recallId, username)

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).toHaveBeenCalledWith(nomisId, username, recallId)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledWith(ualAdjustments[0].id, username)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledWith(ualAdjustments[1].id, username)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledTimes(2)
    })

    it('should delete recall and not attempt UAL deletion if UAL search fails', async () => {
      const searchError = new Error('UAL Search Failed')
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).reply(200)
      adjustmentsService.searchUal = jest.fn().mockRejectedValue(searchError)
      adjustmentsService.deleteAdjustment = jest.fn()

      await expect(recallService.deleteRecall(nomisId, recallId, username)).resolves.toBeUndefined()

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).toHaveBeenCalledWith(nomisId, username, recallId)
      expect(adjustmentsService.deleteAdjustment).not.toHaveBeenCalled()
      expect(loggerErrorSpy).toHaveBeenCalledWith(searchError)
    })

    it('should delete recall, attempt all UAL deletions even if one fails, and log errors', async () => {
      const ualAdjustments = [
        { id: 'ual-uuid-1', person: nomisId, recallId },
        { id: 'ual-uuid-2', person: nomisId, recallId },
      ]
      const deleteError = new Error('UAL Deletion Failed for ual-uuid-1')
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).reply(200)
      adjustmentsService.searchUal = jest.fn().mockResolvedValue(ualAdjustments)
      adjustmentsService.deleteAdjustment = jest
        .fn()
        .mockImplementationOnce(() => Promise.reject(deleteError))
        .mockImplementationOnce(() => Promise.resolve(undefined))

      await expect(recallService.deleteRecall(nomisId, recallId, username)).resolves.toBeUndefined()

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).toHaveBeenCalledWith(nomisId, username, recallId)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledWith(ualAdjustments[0].id, username)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledWith(ualAdjustments[1].id, username)
      expect(adjustmentsService.deleteAdjustment).toHaveBeenCalledTimes(2)
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to delete UAL adjustment ${ualAdjustments[0].id} for recall ${recallId} (person ${nomisId}):`,
        deleteError,
      )
    })

    it('should reject and not attempt UAL operations if initial recall deletion fails', async () => {
      const recallDeleteError = new Error('Recall Deletion Failed')
      fakeRemandAndSentencingApi.delete(`/recall/${recallId}`).replyWithError(recallDeleteError)
      adjustmentsService.searchUal = jest.fn()
      adjustmentsService.deleteAdjustment = jest.fn()

      await expect(recallService.deleteRecall(nomisId, recallId, username)).rejects.toThrow(recallDeleteError)

      expect(fakeRemandAndSentencingApi.isDone()).toBe(true)
      expect(adjustmentsService.searchUal).not.toHaveBeenCalled()
      expect(adjustmentsService.deleteAdjustment).not.toHaveBeenCalled()
    })
  })
})
