import { NextFunction, Request, Response } from 'express'
import { Page } from '../services/auditService'

export interface Controller {
  PAGE_NAME: Page
  GET(req: Request, res: Response, next?: NextFunction): Promise<void>
  POST?(req: Request, res: Response, next?: NextFunction): Promise<void>
}
