import type { Recall } from 'models'
import { HmppsAuthClient } from '../data'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import AdjustmentsService from './adjustmentsService'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { calculateUal } from '../utils/utils'
import { getRecallType } from '../@types/recallTypes'
import logger from '../../logger'

export default class RecallService {
  constructor(
    private readonly hmppsAuthClient: HmppsAuthClient,
    private readonly adjustmentsService: AdjustmentsService,
  ) {}

  async postRecall(recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return (await this.getApiClient(username)).postRecall(recall)
  }

  async getRecall(recallId: string, username: string): Promise<Recall> {
    return this.fromApiRecall(await (await this.getApiClient(username)).getRecall(recallId))
  }

  async updateRecall(recallId: string, recall: CreateRecall, username: string): Promise<CreateRecallResponse> {
    return (await this.getApiClient(username)).updateRecall(recallId, recall)
  }

  async getAllRecalls(nomsId: string, username: string): Promise<Recall[]> {
    const allApiRecalls = await (await this.getApiClient(username)).getAllRecalls(nomsId)

    logger.info(`Fetched recalls for NOMS ID ${nomsId}:`, allApiRecalls[0].sentences)

    return allApiRecalls.map((apiRecall: ApiRecall): Recall => this.fromApiRecall(apiRecall))
  }

  async deleteRecall(nomisId: string, recallId: string, username: string): Promise<void> {
    await (await this.getApiClient(username)).deleteRecall(recallId)

    // Find and delete any UAL adjustments associated with the recall
    try {
      const ualAdjustments = await this.adjustmentsService.searchUal(nomisId, username, recallId)

      if (ualAdjustments && ualAdjustments.length > 0) {
        logger.info(
          `Found ${ualAdjustments.length} UAL adjustment(s) for recall ${recallId} (person ${nomisId}). Attempting deletion.`,
        )
        for (const ualAdjustment of ualAdjustments) {
          try {
            if (ualAdjustment.id) {
              // eslint-disable-next-line no-await-in-loop
              await this.adjustmentsService.deleteAdjustment(ualAdjustment.id, username)
              logger.info(`Successfully deleted UAL adjustment ${ualAdjustment.id} for recall ${recallId}.`)
            } else {
              logger.warn(`UAL adjustment for recall ${recallId} is missing an ID, cannot delete.`)
            }
          } catch (deleteError) {
            logger.error(
              `Failed to delete UAL adjustment ${ualAdjustment.id} for recall ${recallId} (person ${nomisId}):`,
              deleteError,
            )
            // try to delete other adjustments
          }
        }
      } else {
        logger.info(`No UAL adjustments found for recall ${recallId} (person ${nomisId}).`)
      }
    } catch (error) {
      logger.error(error)
    }
  }

  private async getApiClient(username: string): Promise<RemandAndSentencingApiClient> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  fromApiRecall(apiRecall: ApiRecall): Recall {
    // TODO UAL should be stored on the recall in RaS not calculated on the fly
    const ual = calculateUal(apiRecall.revocationDate, apiRecall.returnToCustodyDate)
    const ualString = ual ? `${ual.days} day${ual.days === 1 ? '' : 's'}` : null
    return {
      recallId: apiRecall.recallUuid,
      createdAt: apiRecall.createdAt,
      created_by_username: apiRecall.createdByUsername,
      revocationDate: apiRecall.revocationDate ? new Date(apiRecall.revocationDate) : null,
      returnToCustodyDate: apiRecall.returnToCustodyDate ? new Date(apiRecall.returnToCustodyDate) : null,
      recallType: getRecallType(apiRecall.recallType),
      ual,
      ualString,
      location: apiRecall.createdByPrison,
      sentenceIds: apiRecall.sentences?.map(s => s.sentenceUuid) ?? [],
      courtCaseIds: apiRecall.courtCaseIds,
      sentences: apiRecall.sentences,
      source: apiRecall.source,
    }
  }
}
