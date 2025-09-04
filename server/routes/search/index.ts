import express from 'express'
import searchRoute from './search-route'

const router = express.Router({ mergeParams: true })

// Use the Zod-based search route
router.use(searchRoute)

export default router
