export const AGGRAVATING_FACTOR_LABELS = {
  isTerrorRelated: 'Offences aggravated by a terrorist connection',
  isForeignPowerRelated: 'Offences aggravated by foreign power condition being met',
  isDomesticViolenceRelated: 'Offence aggravated by domestic violence',
} as const

export type ApiAggravatingFactors = Partial<Record<keyof typeof AGGRAVATING_FACTOR_LABELS, boolean | null>>
