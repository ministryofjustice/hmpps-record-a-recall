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
  },
}

export default steps
