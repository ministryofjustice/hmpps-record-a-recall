import { confirmDeleteRecallSchema } from './confirmDeleteRecallSchema'
import { deduplicateFieldErrors } from '../../middleware/validationMiddleware'

describe('confirmDeleteRecall', () => {
  type Form = {
    confirmDeleteRecall?: string
  }

  it('Should return an error if neither yes or no is selected', async () => {
    // Given
    const form = {}

    // When
    const result = await doValidate(form)

    // Then
    expect(result.success).toStrictEqual(false)
    const deduplicatedFieldErrors = deduplicateFieldErrors(result.error!)
    expect(deduplicatedFieldErrors).toStrictEqual({
      confirmDeleteRecall: ['Select if you are sure you want to delete the recall'],
    })
  })

  it.each(['YES', 'NO'])('Should allow yes and no', async (confirmDeleteRecall: string) => {
    // Given
    const form = { confirmDeleteRecall }

    // When
    const result = await doValidate(form)

    // Then
    expect(result.success).toStrictEqual(true)
  })

  const doValidate = async (form: Form) => {
    return confirmDeleteRecallSchema.safeParse(form)
  }
})
