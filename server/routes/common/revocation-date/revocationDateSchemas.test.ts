import { Request } from 'express'
import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { revocationDateSchemaFactory } from './revocationDateSchemas'

describe('revocationDateSchema', () => {
  type Form = {
    day?: string
    month?: string
    year?: string
  }

  const request = {
    params: { journeyId: 'abc' },
    session: { createRecallJourneys: { abc: { crdsValidationResult: { earliestSentenceDate: '1950-01-01' } } } },
  } as unknown as Request

  it('Should return a combined error if revocation date is before earliest sentence date', async () => {
    // Given
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

  const doValidate = async (form: Form) => {
    const schema = await revocationDateSchemaFactory()(request)
    return schema.safeParse(form)
  }
})
