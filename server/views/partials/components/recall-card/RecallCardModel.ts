export default interface RecallCardModel {
  recallUuid: string
  source: 'NOMIS' | 'DPS'
  createdAtTimestamp: string
  createdAtLocationName?: string
  canEdit: boolean
  canDelete: boolean
  recallTypeDescription: string
  revocationDate?: string
  returnToCustodyDate?: string
}
