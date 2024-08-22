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

type SentenceDetail = {
  lineSequence: number // Line sequence number in the court case
  sentencedAt: string // Date the sentence was given (format: date string)
  sentenceLength: string // The length of the sentence (e.g., "5 years")
  consecutiveTo: number | null // Line sequence number to which this sentence is consecutive, or null if concurrent
  crd: string // Adjusted Conditional Release Date (format: date string)
  sled: string // Adjusted Sentence and Licence Expiry Date (format: date string)
}

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
  ): Promise<{
    onLicenceSentences: SentenceDetail[]
    activeSentences: SentenceDetail[]
    expiredSentences: SentenceDetail[]
  }> {
    try {
      const breakdown = await this.getCalculationBreakdown(nomsId, username)

      // 1. Filter and categorize concurrent sentences
      const { onLicenceConcurrent, activeConcurrent, expiredConcurrent } = this.filterAndCategorizeConcurrentSentences(
        breakdown.concurrentSentences,
        recallDate,
      )

      // 2. Filter and categorize consecutive sentence parts
      const { onLicenceConsecutive, activeConsecutive, expiredConsecutive } = breakdown.consecutiveSentence
        ? this.filterAndCategorizeConsecutiveSentenceParts(breakdown.consecutiveSentence, recallDate)
        : { onLicenceConsecutive: [], activeConsecutive: [], expiredConsecutive: [] }

      // Combine all filtered sentences into their respective categories
      const onLicenceSentences = [...onLicenceConcurrent, ...onLicenceConsecutive]
      const activeSentences = [...activeConcurrent, ...activeConsecutive]
      const expiredSentences = [...expiredConcurrent, ...expiredConsecutive]

      // 3. Log if there are no "On Licence" sentences
      if (onLicenceSentences.length === 0) {
        logger.error('There are no sentences eligible for recall.')
      }

      // 4. Return grouped sentences
      return {
        onLicenceSentences,
        activeSentences,
        expiredSentences,
      }
    } catch (error) {
      logger.error(`Error in groupSentencesByRecallDate: ${error.message}`, error)
      return {
        onLicenceSentences: [],
        activeSentences: [],
        expiredSentences: [],
      }
    }
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

      if (!(dateTypes.includes('SLED') && dateTypes.includes('CRD'))) {
        expiredConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
        return
      }

      const crd = new Date(sentence.dates.CRD?.adjusted)
      const sled = new Date(sentence.dates.SLED?.adjusted)

      if (recallDate > sled) {
        expiredConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      } else if (recallDate >= crd && recallDate < sled) {
        onLicenceConcurrent.push(this.mapConcurrentToSentenceDetail(sentence))
      } else if (recallDate >= crd) {
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

    if (!(dateTypes.includes('SLED') && dateTypes.includes('CRD'))) {
      consecutiveSentence.sentenceParts.forEach(part => {
        expiredConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, new Date(), new Date()))
      })
      return { onLicenceConsecutive, activeConsecutive, expiredConsecutive }
    }

    const crd = new Date(consecutiveSentence.dates.CRD?.adjusted)
    const sled = new Date(consecutiveSentence.dates.SLED?.adjusted)

    consecutiveSentence.sentenceParts.forEach(part => {
      if (recallDate > sled) {
        expiredConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      } else if (recallDate >= crd && recallDate < sled) {
        onLicenceConsecutive.push(this.mapConsecutivePartToSentenceDetail(part, crd, sled))
      } else if (recallDate >= crd) {
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
