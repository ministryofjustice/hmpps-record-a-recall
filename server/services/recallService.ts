import type { Recall } from 'models'
import type { DateForm } from 'forms'
import { HmppsAuthClient } from '../data'
import { RecallTypes, SentenceDetail } from '../@types/refData'
import RemandAndSentencingApiClient from '../api/remandAndSentencingApiClient'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { formatDate, getDateFromForm } from '../utils/utils'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import logger from '../../logger'
import {
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class RecallService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  private async getCRDApiClient(username: string) {
    return new CalculateReleaseDatesApiClient(await this.getSystemClientToken(username))
  }

  setRecallDate(session: CookieSessionInterfaces.CookieSessionObject, nomsId: string, recallDateForm: DateForm) {
    const recall = this.getRecall(session, nomsId)
    recall.recallDateForm = recallDateForm
    const recallDate = getDateFromForm(recallDateForm)

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
    const returnToCustodyDate = getDateFromForm(returnToCustodyDateForm)

    if (Number.isNaN(returnToCustodyDate.getTime())) {
      recall.returnToCustodyDate = null
    } else {
      recall.returnToCustodyDate = returnToCustodyDate
    }
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
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

  async calculateReleaseDatesAndSetInSession(
    session: CookieSessionInterfaces.CookieSessionObject,
    username: string,
    nomsId: string,
  ): Promise<void> {
    const recall = this.getRecall(session, nomsId)
    if (recall.calculation) {
      return
    }

    const crdApi = await this.getCRDApiClient(username)
    recall.calculation = await crdApi.calculateReleaseDates(nomsId)
    // eslint-disable-next-line no-param-reassign
    session.recalls[nomsId] = recall
  }

  async groupSentencesByRecallDate(
    username: string,
    recall: Recall,
  ): Promise<
    Array<{
      caseSequence: number
      sentences: {
        onLicenceSentences: SentenceDetail[]
        activeSentences: SentenceDetail[]
        expiredSentences: SentenceDetail[]
      }
    }>
  > {
    try {
      const breakdown = await this.getCalculationBreakdown(username, recall)

      // Filter and categorize concurrent sentences
      const { onLicenceConcurrent, activeConcurrent, expiredConcurrent } = this.filterAndCategorizeConcurrentSentences(
        breakdown.concurrentSentences,
        recall.recallDate,
      )

      // Filter and categorize consecutive sentence parts
      const { onLicenceConsecutive, activeConsecutive, expiredConsecutive } = breakdown.consecutiveSentence
        ? this.filterAndCategorizeConsecutiveSentenceParts(breakdown.consecutiveSentence, recall.recallDate)
        : { onLicenceConsecutive: [], activeConsecutive: [], expiredConsecutive: [] }

      // Combine all filtered sentences into their respective categories
      const onLicenceSentences = [...onLicenceConcurrent, ...onLicenceConsecutive]
      const activeSentences = [...activeConcurrent, ...activeConsecutive]
      const expiredSentences = [...expiredConcurrent, ...expiredConsecutive]

      if (onLicenceSentences.length === 0) {
        logger.error('There are no sentences eligible for recall.')
      }

      return this.groupByCaseSequence(onLicenceSentences, activeSentences, expiredSentences)
    } catch (error) {
      logger.error(`Error in groupSentencesByRecallDate: ${error.message}`, error)
      return []
    }
  }

  async getCalculationBreakdown(username: string, recall: Recall): Promise<CalculationBreakdown | undefined> {
    try {
      const crdApi = await this.getCRDApiClient(username)
      return await crdApi.getCalculationBreakdown(recall.calculation.calculationRequestId)
    } catch (error) {
      logger.error(`Error in getCalculationBreakdown: ${error.message}`, error)
      return undefined
    }
  }

  private groupByCaseSequence(
    onLicence: SentenceDetail[],
    active: SentenceDetail[],
    expired: SentenceDetail[],
  ): Array<{
    caseSequence: number
    sentences: {
      onLicenceSentences: SentenceDetail[]
      activeSentences: SentenceDetail[]
      expiredSentences: SentenceDetail[]
    }
  }> {
    const grouped: Record<
      number,
      {
        onLicenceSentences: SentenceDetail[]
        activeSentences: SentenceDetail[]
        expiredSentences: SentenceDetail[]
      }
    > = {}

    const addToGroup = (sentence: SentenceDetail, category: keyof (typeof grouped)[number]) => {
      if (!grouped[sentence.caseSequence]) {
        grouped[sentence.caseSequence] = {
          onLicenceSentences: [],
          activeSentences: [],
          expiredSentences: [],
        }
      }
      grouped[sentence.caseSequence][category].push(sentence)
    }

    onLicence.forEach(sentence => addToGroup(sentence, 'onLicenceSentences'))
    active.forEach(sentence => addToGroup(sentence, 'activeSentences'))
    expired.forEach(sentence => addToGroup(sentence, 'expiredSentences'))

    return Object.entries(grouped).map(([caseSequence, sentences]) => ({
      caseSequence: parseInt(caseSequence, 10),
      sentences,
    }))
  }

  private filterAndCategorizeConcurrentSentences(
    sentences: ConcurrentSentenceBreakdown[],
    recallDate: Date,
  ): {
    onLicenceConcurrent: SentenceDetail[]
    activeConcurrent: SentenceDetail[]
    expiredConcurrent: SentenceDetail[]
  } {
    const onLicenceConcurrent: SentenceDetail[] = []
    const activeConcurrent: SentenceDetail[] = []
    const expiredConcurrent: SentenceDetail[] = []

    sentences.forEach(sentence => {
      const dateTypes = Object.keys(sentence.dates)

      // Ensure there is either SLED or SED and also CRD
      if (!((dateTypes.includes('SLED') || dateTypes.includes('SED')) && dateTypes.includes('CRD'))) {
        expiredConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
        return
      }

      // Determine whether to use SLED or SED
      const crd = new Date(sentence.dates.CRD?.adjusted)
      const sled = sentence.dates.SLED ? new Date(sentence.dates.SLED.adjusted) : new Date(sentence.dates.SED?.adjusted)

      // Categorize the sentence based on the recall date
      if (recallDate > sled) {
        expiredConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      } else if (recallDate >= crd && recallDate < sled) {
        onLicenceConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      } else if (recallDate < crd) {
        activeConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      } else {
        expiredConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      }
    })

    return { onLicenceConcurrent, activeConcurrent, expiredConcurrent }
  }

  private filterAndCategorizeConsecutiveSentenceParts(
    consecutiveSentence: ConsecutiveSentenceBreakdown,
    recallDate: Date,
  ): {
    onLicenceConsecutive: SentenceDetail[]
    activeConsecutive: SentenceDetail[]
    expiredConsecutive: SentenceDetail[]
  } {
    const onLicenceConsecutive: SentenceDetail[] = []
    const activeConsecutive: SentenceDetail[] = []
    const expiredConsecutive: SentenceDetail[] = []

    const dateTypes = Object.keys(consecutiveSentence.dates)

    // Ensure there is either SLED or SED and also CRD
    if (!((dateTypes.includes('SLED') || dateTypes.includes('SED')) && dateTypes.includes('CRD'))) {
      consecutiveSentence.sentenceParts.forEach(part => {
        expiredConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, new Date(), new Date()))
      })
      return { onLicenceConsecutive, activeConsecutive, expiredConsecutive }
    }

    // Determine whether to use SLED or SED
    const crd = new Date(consecutiveSentence.dates.CRD?.adjusted)
    const sled = consecutiveSentence.dates.SLED
      ? new Date(consecutiveSentence.dates.SLED.adjusted)
      : new Date(consecutiveSentence.dates.SED?.adjusted)

    consecutiveSentence.sentenceParts.forEach(part => {
      if (recallDate > sled) {
        expiredConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      } else if (recallDate >= crd && recallDate < sled) {
        onLicenceConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      } else if (recallDate < crd) {
        activeConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      } else {
        expiredConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      }
    })

    return { onLicenceConsecutive, activeConsecutive, expiredConsecutive }
  }

  private mapConcurrentToSentenceDetail(sentence: ConcurrentSentenceBreakdown): SentenceDetail {
    return {
      lineSequence: sentence.lineSequence,
      caseSequence: sentence.caseSequence,
      sentencedAt: sentence.sentencedAt,
      sentenceLength: sentence.sentenceLength,
      consecutiveTo: null,
      crd: sentence.dates.CRD?.adjusted || '',
      sled: sentence.dates.SLED?.adjusted || '',
    }
  }

  private mapConsecutivePartToSentenceDetail(part: ConsecutiveSentencePart, crd: Date, sled: Date): SentenceDetail {
    return {
      lineSequence: part.lineSequence,
      caseSequence: part.caseSequence,
      sentencedAt: crd.toISOString().split('T')[0], // Assuming CRD is used as the sentencing date for parts
      sentenceLength: part.sentenceLength,
      consecutiveTo: part.consecutiveToLineSequence || null,
      crd: crd.toISOString().split('T')[0],
      sled: sled.toISOString().split('T')[0],
    }
  }
}
