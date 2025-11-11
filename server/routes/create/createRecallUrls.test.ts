import CreateRecallUrls, { buildReturnUrlFromKey } from './createRecallUrls'

describe('buildReturnUrlFromKey', () => {
  const nomsId = 'A1234BC'
  const journeyId = '123e4567-e89b-12d3-a456-426614174000'

  it.each([
    {
      key: 'revocationDate',
      expected: CreateRecallUrls.revocationDate(nomsId, journeyId),
    },
    {
      key: 'manualSelectCases',
      extraParams: { caseIndex: 2 },
      expected: CreateRecallUrls.manualSelectCases(nomsId, journeyId, 2),
    },
  ])('should build the correct URL for returnKey = $key', ({ key, expected, extraParams }) => {
    const url = buildReturnUrlFromKey(key, nomsId, journeyId, extraParams)
    expect(url).toBe(expected)
  })
})
