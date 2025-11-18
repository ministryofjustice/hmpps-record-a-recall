import RecallJourneyUrls, { buildReturnUrlFromKey } from './recallJourneyUrls'

describe('buildReturnUrlFromKey', () => {
  const nomsId = 'A1234BC'
  const journeyId = '123e4567-e89b-12d3-a456-426614174000'
  const aRecallId = 'd9561b78-6df3-4ec2-9a47-41ffbb407364'

  it.each([
    {
      key: 'revocationDate',
      createOrEdit: 'create',
      recallId: null,
      expected: RecallJourneyUrls.revocationDate(nomsId, journeyId, 'create', null),
    },
    {
      key: 'revocationDate',
      createOrEdit: 'edit',
      recallId: aRecallId,
      expected: RecallJourneyUrls.revocationDate(nomsId, journeyId, 'edit', aRecallId),
    },
    {
      key: 'manualSelectCases',
      createOrEdit: 'create',
      recallId: null,
      extraParams: { caseIndex: 2 },
      expected: RecallJourneyUrls.manualSelectCases(nomsId, journeyId, 'create', null, 2),
    },
  ])(
    'should build the correct URL for returnKey = $key $createOrEdit $recallId',
    ({ key, createOrEdit, recallId, expected, extraParams }) => {
      const url = buildReturnUrlFromKey(
        key,
        nomsId,
        journeyId,
        createOrEdit as 'edit' | 'create',
        recallId,
        extraParams,
      )
      expect(url).toBe(expected)
    },
  )
})
