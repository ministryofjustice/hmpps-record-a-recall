import { Request, Response } from 'express'

/**
 * Get the full recall route path including the prisoner ID
 * @param path - The relative path (e.g., '/check-sentences')
 * @param req - The request object
 * @param res - The response object
 * @returns The full path (e.g., '/person/A1234BC/record-recall/check-sentences')
 */
export function getFullRecallPath(path: string, req: Request, res: Response): string {
  const prisoner = res.locals.prisoner || {}
  const prisonerId = prisoner.prisonerNumber || req.params.nomisId || req.params.prisonerId

  // Removed console.log statements for production

  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path

  const fullPath = `/person/${prisonerId}/record-recall/${cleanPath}`
  // Removed console.log for production

  return fullPath
}

/**
 * Get the full edit recall route path
 * @param path - The relative path
 * @param req - The request object
 * @param res - The response object
 * @returns The full edit path
 */
export function getFullEditRecallPath(path: string, req: Request, res: Response): string {
  const prisoner = res.locals.prisoner || {}
  const prisonerId = prisoner.prisonerNumber || req.params.prisonerId
  const recallId = res.locals.recallId || req.params.recallId || req.session.formData?.recallId

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path

  return `/person/${prisonerId}/recall/${recallId}/edit/${cleanPath}`
}
