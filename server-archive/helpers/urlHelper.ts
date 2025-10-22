import config from '../config'

export default function getServiceUrls(nomisId: string) {
  return {
    recalls: `${config.applications.recordARecall.url}/person/${nomisId}`,
    crds: `${config.applications.calculateReleaseDates.url}/?prisonId=${nomisId}`,
    adjustments: `${config.applications.adjustments.url}/${nomisId}`,
    adjustmentsOverview: `${config.applications.adjustments.url}/${nomisId}/unlawfully-at-large/view`,
    profile: `${config.applications.digitalPrisonServices.url}/prisoner/${nomisId}`,
    ccards: `${config.applications.courtCasesReleaseDates.url}/prisoner/${nomisId}/overview`,
  }
}
