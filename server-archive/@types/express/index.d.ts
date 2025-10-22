import { Recall } from '../models'
import { HmppsUser } from '../../interfaces/hmppsUser'
import { Services } from '../../services'
import { RecallSessionData } from '../../services/sessionTypes'
import { PrisonerSearchApiPrisoner } from '../prisonerSearchApi/prisonerSearchTypes'

export declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    nowInMinutes: number
    recalls: Map<string, Recall>
    recallsSessionData: Record<string, RecordARecallSessionData>
  }
}

export declare global {
  namespace Express {
    interface User {
      username: string
      token: string
      authSource: string
    }

    interface Request {
      verified?: boolean
      id: string
      services?: Services
      logout(done: (err: unknown) => void): void
      flash(type: string, message: Array<Record<string, string>>): number
      flash(message: 'errors'): Array<Record<string, string>>
      flash(type: string, message: Record<string, unknown>): number
    }

    interface Locals {
      user: HmppsUser
      prisoner: PrisonerSearchApiPrisoner
    }
  }
}
