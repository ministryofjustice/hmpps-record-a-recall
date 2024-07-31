import type { Recall } from 'models'
import type { DateForm } from 'forms'
import { HmppsAuthClient } from '../data'
import { RecallTypes } from '../@types/refData'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { formatDate } from '../utils/utils'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  setRecallDate(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallDateForm: DateForm) {
    const recall = this.getRecall(session, nomsId)
    recall.recallDateForm = recallDateForm
    const year = parseInt(recallDateForm.year, 10)
    const month = parseInt(recallDateForm.month, 10) - 1
    const day = parseInt(recallDateForm.day, 10)
    const recallDate = new Date(year, month, day)

    if (Number.isNaN(recallDate.getTime())) {
      recall.recallDate = null
    } else {
      recall.recallDate = recallDate
    }
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  setReturnToCustodyDate(
    session: CookieSessionInterfaces.CookieSessionObject,
    nomsId: string,
    returnToCustodyDateForm: DateForm,
  ) {
    const recall = this.getRecall(session, nomsId)
    recall.returnToCustodyDateForm = returnToCustodyDateForm
    const year = parseInt(returnToCustodyDateForm.year, 10)
    const month = parseInt(returnToCustodyDateForm.month, 10) - 1
    const day = parseInt(returnToCustodyDateForm.day, 10)
    const returnToCustodyDate = new Date(year, month, day)

    if (Number.isNaN(returnToCustodyDate.getTime())) {
      recall.returnToCustodyDate = null
    } else {
      recall.returnToCustodyDate = returnToCustodyDate
    }
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  getRecall(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string): Recall {
    const recall = session.recalls[nomsId] ?? ({} as Recall)
    if (recall.recallDate && typeof recall.recallDate === 'string') {
      recall.recallDate = new Date(recall.recallDate)
    }
    if (recall.returnToCustodyDate && typeof recall.returnToCustodyDate === 'string') {
      recall.returnToCustodyDate = new Date(recall.returnToCustodyDate)
    }
    return recall
  }

  removeRecall(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string) {
    if (session.recalls && session.recalls[nomsId]) {
      // eslint-disable-next-line no-param-reassign
      delete session.recalls[nomsId]
    }
  }

  setRecallType(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallTypeCode: string) {
    const recall = this.getRecall(session, nomsId)
    recall.recallType = Object.values(RecallTypes).find(it => it.code === recallTypeCode)
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  async createRecall(
    session: CookieSessionInterfaces.CookieSessionObject,
    nomsId: string,
    username: string,
  ): Promise<CreateRecallResponse> {
    const recall = this.getRecall(session, nomsId)
    const createRecall: CreateRecall = {
      prisonerId: nomsId,
      recallDate: formatDate(recall.recallDate),
      returnToCustodyDate: formatDate(recall.returnToCustodyDate),
      recallType: recall.recallType.code,
      createdByUsername: username,
    }
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username)).postRecall(createRecall)
  }

  async getAllRecalls(nomsId: string, username: string): Promise<Recall[]> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
    const allApiRecalls = await client.getAllRecalls(nomsId)

    return allApiRecalls.map((apiRecall: ApiRecall): Recall => {
      const { recallDate, returnToCustodyDate, recallType } = apiRecall
      return {
        recallDate: new Date(recallDate),
        returnToCustodyDate: new Date(returnToCustodyDate),
        recallType: RecallTypes[recallType],
      }
    })
  }
}
