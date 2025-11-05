import { Request } from 'express'
import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { returnToCustodyDateSchemaFactory } from './returnToCustodyDateSchemas'
import { CreateRecallJourney } from '../../../@types/journeys'

describe('returnToCustodyDateSchema', () => {
  type Form = {
    day?: string
    month?: string
    year?: string
    inCustodyAtRecall?: string
  }

  const request = {
    params: { journeyId: 'abc' },
    session: {
      createRecallJourneys: {
        abc: {
          crdsValidationResult: { earliestSentenceDate: '2025-01-01' },
          revocationDate: {
            day: 1,
            month: 6,
            year: 2025,
          },
        } as CreateRecallJourney,
      },
    },
  } as unknown as Request

  it('Should return an error if in custody at recall not set', async () => {
    // Given
    const form = {}

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      inCustodyAtRecall: ['Select whether the person was in prison when the recall was made'],
    })
  })
  it('Should not validate date if in custody is true', async () => {
    // Given
    const form = { inCustodyAtRecall: 'true' }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(true)
  })
  it('Should validate date if in custody is false', async () => {
    // Given
    const form = { inCustodyAtRecall: 'false' }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Enter the date'],
      month: [''],
      year: [''],
    })
  })
  it('Should validate date in future if not in custody', async () => {
    // Given
    const form = { inCustodyAtRecall: 'false', day: '1', month: '2', year: (new Date().getFullYear() + 10).toString() }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Arrest date must be today or in the past'],
      month: [''],
      year: [''],
    })
  })
  it('Should validate arrest date before recall date', async () => {
    // Given
    const form = { inCustodyAtRecall: 'false', day: '1', month: '2', year: '2025' }

    // When
    const result = await doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      day: ['Arrest date cannot be before recall date'],
      month: [''],
      year: [''],
    })
  })

  const doValidate = async (form: Form) => {
    const schema = await returnToCustodyDateSchemaFactory()(request)
    return schema.safeParse(form)
  }
})
