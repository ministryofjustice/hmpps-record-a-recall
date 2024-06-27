import type { Recall } from 'models'
import type { DateForm } from 'forms'
import { HmppsAuthClient } from '../data'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async setRecallDate(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallDateForm: DateForm) {
    const recall = await this.getRecall(session, nomsId)
    recall.recallDate = new Date(
      recallDateForm.year as unknown as number,
      (recallDateForm.month as unknown as number) - 1,
      recallDateForm.day as unknown as number,
    )
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  async setReturnToCustodyDate(
    session: CookieSessionInterfaces.CookieSessionObject,
    nomsId: string,
    returnToCustodyDateForm: DateForm,
  ) {
    const recall = await this.getRecall(session, nomsId)
    recall.returnToCustodyDate = new Date(
      returnToCustodyDateForm.year as unknown as number,
      (returnToCustodyDateForm.month as unknown as number) - 1,
      returnToCustodyDateForm.day as unknown as number,
    )
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async getRecall(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string): Promise<Recall> {
    const recall = session.recalls[nomsId] ?? ({} as Recall)
    if (recall.recallDate && typeof recall.recallDate === 'string') {
      recall.recallDate = new Date(recall.recallDate)
    }
    if (recall.returnToCustodyDate && typeof recall.returnToCustodyDate === 'string') {
      recall.returnToCustodyDate = new Date(recall.returnToCustodyDate)
    }
    return recall
  }
}
