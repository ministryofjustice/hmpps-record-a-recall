import config from '../config'

export default class OtherServiceUrls {
  static rasDashboard = (nomsId: string) => `${config.urls.remandAndSentencing}/person/${nomsId}`

  static rasUnknownSentenceTypes = (nomsId: string, params: string) =>
    `${config.urls.remandAndSentencing}/person/${nomsId}/unknown-recall-sentence?${params}`

  static rasCheckAutomaticSentenceFixes = (nomsId: string) =>
    `${config.urls.remandAndSentencing}/person/${nomsId}/check-automatic-sentence-fix`
}
