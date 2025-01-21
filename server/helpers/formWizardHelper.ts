import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import { RecallType, RecallTypes } from '../@types/recallTypes'

export default function getJourneyDataFromRequest(req: FormWizard.Request): RecallJourneyData {
  const storedRecall = req.sessionModel.get<Recall>('storedRecall')
  const ual = req.sessionModel.get<number>('ual')
  const standardOnlyRecall = req.sessionModel.get<boolean>('standardOnlyRecall')
  const manualSentenceSelection = req.sessionModel.get<boolean>('manualSentenceSelection')
  const ualText = ual !== undefined ? `${ual} day${ual === 1 ? '' : 's'}` : undefined
  const eligibleSentenceCount = req.sessionModel.get<number>('eligibleSentenceCount')
  const recallType = standardOnlyRecall
    ? RecallTypes.STANDARD_RECALL
    : getRecallType(req.sessionModel.get<string>('recallType'))
  const recallDate = req.sessionModel.get<string>('recallDate')
  const returnToCustodyDate = req.sessionModel.get<string>('returnToCustodyDate')

  return {
    storedRecall,
    recallDate: recallDate ? new Date(recallDate) : null,
    recallDateString: recallDate,
    inPrisonAtRecall: req.sessionModel.get<boolean>('inPrisonAtRecall'),
    returnToCustodyDate: returnToCustodyDate ? new Date(returnToCustodyDate) : null,
    returnToCustodyDateString: returnToCustodyDate,
    ual,
    ualText,
    manualSentenceSelection,
    recallType,
    standardOnlyRecall,
    eligibleSentenceCount,
    isEdit: req.sessionModel.get<boolean>('isEdit'),
  }
}

export type RecallJourneyData = {
  storedRecall?: Recall
  recallDate?: Date
  recallDateString?: string
  inPrisonAtRecall: boolean
  returnToCustodyDate?: Date
  returnToCustodyDateString?: string
  ual?: number
  ualText?: string
  manualSentenceSelection: boolean
  recallType: RecallType
  standardOnlyRecall?: boolean
  eligibleSentenceCount: number
  isEdit: boolean
}

function getRecallType(code: string): RecallType {
  return Object.values(RecallTypes).find(it => it.code === code)
}
