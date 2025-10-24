import { Router } from 'express'
import { getUserCaseLoads, populateCurrentUser } from './populateCurrentUser'
import type { Services } from '../services'

export default function setUpCurrentUser({ userService }: Services): Router {
  const router = Router({ mergeParams: true })
  router.use(populateCurrentUser())
  router.use(getUserCaseLoads(userService))
  return router
}
