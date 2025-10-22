import { Recall } from 'models'
import { ApiRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export type RecordARecallSessionData = {
  recall: ApiRecall
  earliestSentenceDate: Date
}
