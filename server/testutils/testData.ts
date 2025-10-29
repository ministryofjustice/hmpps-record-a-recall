import { v4 as uuidv4 } from 'uuid'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import {
  ApiRecall,
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { CcrdServiceDefinitions } from '../@types/courtCasesReleaseDatesApi/types'
import { ExistingRecall } from '../model/ExistingRecall'

export default class TestData {
  static prisoner = ({
    prisonerNumber = 'A1234BC',
    firstName = 'JOHN',
    lastName = 'SMITH',
    dateOfBirth = '1975-04-02',
    prisonId = 'HEI',
    prisonName = 'HMP Hewell',
    cellLocation = '1-1-C-028',
    locationDescription = undefined,
  }: Partial<PrisonerSearchApiPrisoner> = {}): PrisonerSearchApiPrisoner =>
    ({
      prisonerNumber,
      firstName,
      lastName,
      dateOfBirth,
      prisonId,
      prisonName,
      cellLocation,
      locationDescription,
    }) as PrisonerSearchApiPrisoner

  static apiRecall = ({
    recallUuid = uuidv4(),
    prisonerId = 'A1234BC',
    revocationDate = undefined,
    returnToCustodyDate = undefined,
    inPrisonOnRevocationDate = false,
    recallType = 'FTR_28',
    createdAt = '2021-03-19T13:40:56Z',
    createdByUsername = 'user1',
    createdByPrison = undefined,
    source = 'DPS',
    sentences = [],
    courtCaseIds = [],
    courtCases = [],
  }: Partial<ApiRecall> = {}): ApiRecall =>
    ({
      recallUuid,
      prisonerId,
      revocationDate,
      returnToCustodyDate,
      inPrisonOnRevocationDate,
      recallType,
      createdAt,
      createdByUsername,
      createdByPrison,
      source,
      sentences,
      courtCaseIds,
      courtCases,
    }) as ApiRecall

  static existingRecall = ({
    recallUuid = uuidv4(),
    createdAtTimestamp = '2025-06-20',
    createdAtLocationName = undefined,
    revocationDate = undefined,
    returnToCustodyDate = undefined,
    source = 'DPS',
    ualAdjustmentTotalDays = undefined,
    canEdit = false,
    canDelete = false,
    recallTypeDescription = '28-day fixed-term',
    courtCases = [],
  }: Partial<ExistingRecall> = {}): ExistingRecall =>
    ({
      recallUuid,
      createdAtTimestamp,
      createdAtLocationName,
      revocationDate,
      returnToCustodyDate,
      source,
      ualAdjustmentTotalDays,
      canEdit,
      canDelete,
      recallTypeDescription,
      courtCases,
    }) as ExistingRecall

  static serviceDefinitions = ({
    services = {
      overview: {
        href: 'https://cccard/prisoner/A1234BC/overview',
        text: 'Overview',
        thingsToDo: {
          count: 0,
        },
      },
      recalls: {
        href: 'https://recalls/person/A1234BC',
        text: 'Recalls',
        thingsToDo: {
          count: 0,
        },
      },
      releaseDates: {
        href: 'https://crds?prisonId=A1234BC',
        text: 'Release dates and calculations',
        thingsToDo: {
          count: 0,
        },
      },
      adjustments: {
        href: 'https://adjustments?prisonId=A1234BC',
        text: 'Adjustments',
        thingsToDo: {
          count: 0,
        },
      },
    },
  }: Partial<CcrdServiceDefinitions> = {}): CcrdServiceDefinitions =>
    ({
      services,
    }) as CcrdServiceDefinitions

  static recallableSentence(overrides: Partial<RecallableCourtCaseSentence & { offenceDescription?: string }> = {}) {
    return {
      isRecallable: true,
      sentenceTypeDescription: 'Standard Determinate',
      offenceCode: 'OFF1',
      offenceDescription: 'Offence 1',
      ...overrides,
    } as RecallableCourtCaseSentence
  }

  static nonRecallableSentence(overrides: Partial<RecallableCourtCaseSentence & { offenceDescription?: string }> = {}) {
    return {
      isRecallable: false,
      sentenceTypeDescription: 'Community Order',
      offenceCode: 'OFF2',
      offenceDescription: 'Offence 2',
      ...overrides,
    } as RecallableCourtCaseSentence
  }

  static recallableCourtCase(
    recallableSentences: RecallableCourtCaseSentence[],
    nonRecallableSentences: RecallableCourtCaseSentence[],
    overrides: Partial<RecallableCourtCase> = {},
  ): RecallableCourtCase & {
    recallableSentences: RecallableCourtCaseSentence[]
    nonRecallableSentences: RecallableCourtCaseSentence[]
  } {
    return {
      courtCaseUuid: 'uuid-1',
      reference: 'REF-1',
      courtCode: 'ABC',
      status: 'ACTIVE',
      isSentenced: true,
      date: '2025-01-01',
      firstDayInCustody: '2024-12-15',
      sentences: [...recallableSentences, ...nonRecallableSentences],
      recallableSentences,
      nonRecallableSentences,
      ...overrides,
    }
  }
}
