/* eslint-disable no-param-reassign */
import { Application } from 'express'
import config from '../config'

const setUpEnvironmentName = (app: Application) => {
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
}

export default setUpEnvironmentName
