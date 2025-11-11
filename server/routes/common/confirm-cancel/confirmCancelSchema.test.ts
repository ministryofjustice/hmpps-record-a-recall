import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { confirmCancelSchema } from './confirmCancelSchema'

describe('confirmCancelSchema', () => {
  type Form = {
    confirmCancel?: string
  }

  it('fails when nothing is selected', async () => {
    const result = doValidate({})
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      confirmCancel: ['Select whether you want to cancel or not'],
    })
  })

  it('fails when value is an empty string', async () => {
    const result = doValidate({ confirmCancel: '' })
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      confirmCancel: ['Select whether you want to cancel or not'],
    })
  })

  it('passes when "YES" is selected', async () => {
    const result = doValidate({ confirmCancel: 'YES' })
    expect(result.success).toBe(true)
  })

  it('passes when "NO" is selected', async () => {
    const result = doValidate({ confirmCancel: 'NO' })
    expect(result.success).toBe(true)
  })

  const doValidate = (form: Form) => {
    return confirmCancelSchema.safeParse(form)
  }
})
