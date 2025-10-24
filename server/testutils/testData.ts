import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'

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
}
