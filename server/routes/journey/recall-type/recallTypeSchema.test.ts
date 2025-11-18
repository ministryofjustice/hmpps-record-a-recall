import { ApiRecallType } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { recallTypeSchema } from './recallTypeSchema'

describe('recallTypeSchema', () => {
  type Form = {
    recallType?: ApiRecallType
  }

  it('Should return an error if recall type not set', () => {
    // Given
    const form = {}

    // When
    const result = doValidate(form)

    // Then

    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      recallType: ['Select a recall type'],
    })
  })
  it('Should pass if recall type set', () => {
    // Given
    const form = { recallType: 'LR' } as Form

    // When
    const result = doValidate(form)

    // Then

    expect(result.success).toStrictEqual(true)
  })

  const doValidate = (form: Form) => {
    return recallTypeSchema.safeParse(form)
  }
})
