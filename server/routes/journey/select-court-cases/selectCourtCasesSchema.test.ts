import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { selectCourtCasesSchema } from './selectCourtCasesSchema'

describe('selectCourtCasesSchema', () => {
  type Form = {
    activeSentenceChoice?: string
  }

  it('fails when nothing is selected', async () => {
    const result = doValidate({})
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      activeSentenceChoice: ['Select whether this case had an active sentence'],
    })
  })

  it('fails when value is an empty string', async () => {
    const result = doValidate({ activeSentenceChoice: '' })
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      activeSentenceChoice: ['Select whether this case had an active sentence'],
    })
  })

  it('passes when "YES" is selected', async () => {
    const result = doValidate({ activeSentenceChoice: 'YES' })
    expect(result.success).toBe(true)
  })

  it('passes when "NO" is selected', async () => {
    const result = doValidate({ activeSentenceChoice: 'NO' })
    expect(result.success).toBe(true)
  })

  const doValidate = (form: Form) => {
    return selectCourtCasesSchema.safeParse(form)
  }
})
