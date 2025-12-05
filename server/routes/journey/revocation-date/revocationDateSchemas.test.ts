import { Request } from 'express'
import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { revocationDateSchemaFactory } from './revocationDateSchemas'
import RecallService from '../../../services/recallService'

jest.mock('../../../services/recallService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
describe('revocationDateSchema', () => {
  type Form = {
    day?: string
    month?: string
    year?: string
  }

  const request = {
    params: { nomsId: 'xyz123', journeyId: 'abc' },
    user: { username: 'username' },
    session: { recallJourneys: { abc: { crdsValidationResult: { earliestSentenceDate: '2024-01-01' } } } },
  } as unknown as Request

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Should return a combined error if revocation date is before earliest sentence date', async () => {
    // Given
    recallService.getLatestRevocationDate.mockResolvedValue(new Date('2025-01-01'))
    const form = { day: '1', month: '1', year: '1949' }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Revocation date must be after the earliest sentence date'],
      month: [''],
      year: [''],
    })
  })

  it('Should return a  error if revocation date is equal to earliest sentence date', async () => {
    recallService.getLatestRevocationDate.mockResolvedValue(new Date('2025-01-01'))
    const form = { day: '1', month: '1', year: '2024' }

    const result = await doValidate(form)

    expect(result.success).toStrictEqual(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      day: ['Revocation date must be after the earliest sentence date'],
      month: [''],
      year: [''],
    })
  })

  it('Should return a combined error if revocation date is before previous recall', async () => {
    // Given
    recallService.getLatestRevocationDate.mockResolvedValue(new Date('2025-01-01'))
    const form = { day: '1', month: '6', year: '2024' }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Revocation date must be after previously recorded recall date 01 Jan 2025'],
      month: [''],
      year: [''],
    })
  })

  it('Should return a error if revocation date is equal to previous revocation date', async () => {
    recallService.getLatestRevocationDate.mockResolvedValue(new Date('2025-01-01'))
    const form = { day: '1', month: '01', year: '2025' }

    const result = await doValidate(form)

    expect(result.success).toStrictEqual(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      day: ['Revocation date must be after previously recorded recall date 01 Jan 2025'],
      month: [''],
      year: [''],
    })
  })

  const doValidate = async (form: Form) => {
    const schema = await revocationDateSchemaFactory(recallService)(request)
    return schema.safeParse(form)
  }
})
