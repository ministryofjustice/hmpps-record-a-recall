import type { Recall } from 'models'
import type { RecallDateForm } from 'forms'
import { HmppsAuthClient } from '../data'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  setRecallDate(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallDateForm: RecallDateForm) {
    const recall = this.getRecall(session, nomsId)
    recall.recallDate = new Date(
      recallDateForm['recallDate-year'] as unknown as number,
      (recallDateForm['recallDate-month'] as unknown as number) - 1,
      recallDateForm['recallDate-day'] as unknown as number,
    )
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  private getRecall(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string): Recall {
    return session.recalls[nomsId] ?? ({} as Recall)
  }
}
