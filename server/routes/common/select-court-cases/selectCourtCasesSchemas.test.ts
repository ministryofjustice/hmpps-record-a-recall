import { Request } from 'express'
import { deduplicateFieldErrors } from '../../../middleware/validationMiddleware'
import { selectCourtCasesSchemaFactory } from './selectCourtCasesSchemas'

describe('selectCourtCasesSchema', () => {
  type Form = {
    activeSentenceChoice?: string
  }

  const request = {
    params: { journeyId: 'abc' },
    session: { createRecallJourneys: { abc: {} } },
  } as unknown as Request

  it('fails when nothing is selected', async () => {
    const result = await doValidate({})
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      activeSentenceChoice: ['Select whether this case had an active sentence'],
    })
  })

  it('fails when value is an empty string', async () => {
    const result = await doValidate({ activeSentenceChoice: '' })
    expect(result.success).toBe(false)
    const errors = deduplicateFieldErrors(result.error!)
    expect(errors).toStrictEqual({
      activeSentenceChoice: ['Select whether this case had an active sentence'],
    })
  })

  it('passes when "YES" is selected', async () => {
    const result = await doValidate({ activeSentenceChoice: 'YES' })
    expect(result.success).toBe(true)
  })

  it('passes when "NO" is selected', async () => {
    const result = await doValidate({ activeSentenceChoice: 'NO' })
    expect(result.success).toBe(true)
  })

  const doValidate = async (form: Form) => {
    const schema = await selectCourtCasesSchemaFactory()(request)
    return schema.safeParse(form)
  }
})
