import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../logger'
import PrisonerService from './prisonerService'
import RecallService from './recallService'
import PrisonService from './PrisonService'
import CourtCasesReleaseDatesService from './courtCasesReleaseDatesService'

/**
 * Centralised service for managing data flow to templates
 * Standardises how data is populated in res.locals across the application
 */
export default class DataFlowService {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
    private readonly prisonService: PrisonService,
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
  ) {}

  /**
   * Populates prisoner details in res.locals
   * Standardised replacement for setPrisonerDetailsInLocals function
   */
  async setPrisonerDetails(res: Response): Promise<void> {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return
    }

    try {
      const prisoner = await this.prisonerService.getPrisonerDetails(nomisId, user.username)
      res.locals.prisoner = prisoner
      logger.debug(`Prisoner details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
      res.locals.prisoner = null
    }
  }

  /**
   * Populates recall data with location names for the person home page
   */
  async setRecallsWithLocationNames(res: Response): Promise<void> {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      return
    }

    try {
      const recalls = await this.recallService.getAllRecalls(nomisId, user.username)

      if (recalls && recalls.length > 0) {
        // Get location names for all recalls
        const locationIds = recalls.map(r => r.location)
        const prisonNames = await this.prisonService.getPrisonNames(locationIds, user.username)

        // Add location names to recalls
        const recallsWithLocationNames = recalls.map(recall => ({
          ...recall,
          locationName: prisonNames.get(recall.location),
        }))

        res.locals.recalls = recallsWithLocationNames
        res.locals.latestRecallId = this.findLatestRecallId(recallsWithLocationNames)
      } else {
        res.locals.recalls = []
        res.locals.latestRecallId = undefined
      }
    } catch (error) {
      logger.error(error, `Failed to load recalls for ${nomisId}`)
      res.locals.recalls = []
    }
  }

  /**
   * Populates service definitions from CRDS
   */
  async setServiceDefinitions(req: Request, res: Response): Promise<void> {
    const { nomisId } = res.locals

    if (!nomisId || !req.user?.token) {
      return
    }

    try {
      const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomisId, req.user.token)
      res.locals.serviceDefinitions = serviceDefinitions
    } catch (error) {
      logger.error(error, `Failed to load service definitions for ${nomisId}`)
      res.locals.serviceDefinitions = null
    }
  }

  /**
   * Sets up common template data that's needed across multiple pages
   */
  async setCommonTemplateData(req: Request, res: Response): Promise<void> {
    const { nomisId, user } = res.locals

    // Set basic template data
    res.locals.nomisId = nomisId
    res.locals.user = user

    // Handle flash messages consistently
    this.setFlashMessages(req, res)
  }

  /**
   * Standardised flash message handling
   */
  private setFlashMessages(req: Request, res: Response): void {
    const banner: {
      success?: {
        title: string
        content: string
      }
    } = {}

    const success = req.flash('success')
    if (success?.length) {
      // @ts-expect-error This works
      // eslint-disable-next-line prefer-destructuring
      banner.success = success[0]
    }

    const error = req.flash('errorMessage')

    res.locals.banner = banner
    res.locals.errorMessage = error?.length ? error[0] : null
  }

  /**
   * Find the latest recall by createdAt date
   */
  private findLatestRecallId(recalls: Recall[]): string | undefined {
    if (!recalls || recalls.length === 0) {
      return undefined
    }

    const latestRecall = recalls.reduce((latest, current) => {
      if (
        !latest ||
        (current.createdAt && latest.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))
      ) {
        return current
      }
      return latest
    }, null)

    return latestRecall?.recallId
  }

  /**
   * Middleware factory for common data loading
   * Use this to create middleware that automatically populates common data
   */
  createDataMiddleware(
    options: {
      loadPrisoner?: boolean
      loadRecalls?: boolean
      loadServiceDefinitions?: boolean
    } = {},
  ) {
    return async (req: Request, res: Response, next: (error?: Error) => void) => {
      try {
        // Always set common template data
        await this.setCommonTemplateData(req, res)

        // Conditionally load additional data
        if (options.loadPrisoner) {
          await this.setPrisonerDetails(res)
        }

        if (options.loadRecalls) {
          await this.setRecallsWithLocationNames(res)
        }

        if (options.loadServiceDefinitions) {
          await this.setServiceDefinitions(req, res)
        }

        next()
      } catch (error) {
        logger.error(error, 'Error in data middleware')
        next(error)
      }
    }
  }
}
