import { Readable } from 'stream'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonApiClient from '../api/prisonApiClient'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import {
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../logger'
import { SentenceDetail } from '../@types/refData'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, username: string): Promise<PrisonerSearchApiPrisoner> {
    return new PrisonerSearchApiClient(await this.getSystemClientToken(username)).getPrisonerDetails(nomsId)
  }

  async getPrisonerImage(nomsId: string, username: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(nomsId)
  }

  async getCalculationBreakdown(nomsId: string, username: string): Promise<CalculationBreakdown | undefined> {
    try {
      const crdApi = await this.getCRDApiClient(username)
      const latestCalculation = await crdApi.getLatestCalculation(nomsId)
      return await crdApi.getCalculationBreakdown(latestCalculation.calculationRequestId)
    } catch (error) {
      logger.error(`Error in getCalculationBreakdown: ${error.message}`, error)
      return undefined
    }
  }

  async getSentencesAndReleaseDates(
    nomsId: string,
    username: string,
  ): Promise<SentenceAndOffenceWithReleaseArrangements[]> {
    const crdApi = await this.getCRDApiClient(username)
    const latestCalculation = await crdApi.getLatestCalculation(nomsId)
    return crdApi.getSentencesAndReleaseDates(latestCalculation.calculationRequestId)
  }

  async groupSentencesByRecallDate(
    nomsId: string,
    username: string,
    recallDate: Date,
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
      const breakdown = await this.getCalculationBreakdown(nomsId, username)

      // Filter and categorize concurrent sentences
      const { onLicenceConcurrent, activeConcurrent, expiredConcurrent } = this.filterAndCategorizeConcurrentSentences(
        breakdown.concurrentSentences,
        recallDate,
      )

      // Filter and categorize consecutive sentence parts
      const { onLicenceConsecutive, activeConsecutive, expiredConsecutive } = breakdown.consecutiveSentence
        ? this.filterAndCategorizeConsecutiveSentenceParts(breakdown.consecutiveSentence, recallDate)
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

  private async getCRDApiClient(username: string) {
    return new CalculateReleaseDatesApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
