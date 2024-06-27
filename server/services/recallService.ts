import type { Recall } from 'models'
import type { DateForm } from 'forms'
import { HmppsAuthClient } from '../data'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  setRecallDate(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallDateForm: DateForm) {
    const recall = this.getRecall(session, nomsId)
    recall.recallDate = new Date(
      recallDateForm.year as unknown as number,
      (recallDateForm.month as unknown as number) - 1,
      recallDateForm.day as unknown as number,
    )
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
    return recall
  }
}
