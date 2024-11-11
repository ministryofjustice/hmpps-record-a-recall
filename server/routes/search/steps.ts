import PersonSearchController from '../../controllers/search/personSearchController'

const steps = {
  '/': {
    entryPoint: true,
    reset: true,
    resetJourney: true,
    skip: true,
    next: 'nomisId',
  },
  '/nomisId': {
    fields: ['nomisId'],
    controller: PersonSearchController,
    template: 'search',
    checkSession: false,
    checkJourney: false,
  },
}

export default steps
