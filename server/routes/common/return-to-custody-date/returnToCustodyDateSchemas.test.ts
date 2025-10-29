import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { returnToCustodyDateSchema } from './returnToCustodyDateSchemas'

describe('returnToCustodyDateSchema', () => {
  type Form = {
    day?: string
    month?: string
    year?: string
    inCustodyAtRecall?: string
  }

  it('Should return an error if in custody at recall not set', () => {
    // Given
    const form = {}

    // When
    const result = doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      inCustodyAtRecall: ['Select whether the person was in prison when the recall was made'],
    })
  })
  it('Should not validate date if in custody is true', () => {
    // Given
    const form = { inCustodyAtRecall: 'true' }

    // When
    const result = doValidate(form)

    // Then

    expect(result.success).toStrictEqual(true)
  })
  it('Should validate date if in custody is false', () => {
    // Given
    const form = { inCustodyAtRecall: 'false' }

    // When
    const result = doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Enter the date'],
      month: [''],
      year: [''],
    })
  })

  const doValidate = (form: Form) => {
    return returnToCustodyDateSchema.safeParse(form)
  }
})
