import config from '../config'

export default function getServiceUrls(nomisId: string) {
  return {
    recalls: `${config.applications.recordARecall.url}/person/${nomisId}`,
    crds: `${config.applications.calculateReleaseDates.url}/person/${nomisId}`,
    adjustments: `${config.applications.adjustments.url}/${nomisId}`,
    profile: `${config.applications.digitalPrisonServices.url}/prisoner/${nomisId}`,
    ccards: `${config.applications.courtCasesReleaseDates.url}/prisoner/${nomisId}/overview`,
  }
}
