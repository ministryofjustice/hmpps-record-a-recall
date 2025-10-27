import { v4 as uuidv4 } from 'uuid'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import { ApiRecall } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

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
    revocationDate = '2024-05-23',
    returnToCustodyDate = undefined,
    inPrisonOnRevocationDate = false,
    recallType = 'FTR_28',
    createdAt = '2021-03-19T13:40:56Z',
    createdByUsername = 'user1',
    createdByPrison = undefined,
    source = 'DPS',
    sentences = [],
    courtCaseIds = [],
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
    }) as ApiRecall
}
