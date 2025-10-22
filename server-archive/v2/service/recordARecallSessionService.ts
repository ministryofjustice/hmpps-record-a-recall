import { Request } from 'express'
import { RecallSessionData } from '../../services/sessionTypes'
import { RecordARecallSessionData } from '../model/recordARecallSessionData'

export function getSessionData(req: Request, prisonerId: string): RecordARecallSessionData {
  initialiseSession(req)
  return req.session.recallsSessionData[prisonerId]
}

export function clearSessionData(req: Request, prisonerId: string): void {
  initialiseSession(req)
  req.session.recallsSessionData[prisonerId] = undefined
}

export function setSessionData(req: Request, prisonerId: string, sessionData: RecordARecallSessionData): void {
  initialiseSession(req)
  req.session.recallsSessionData[prisonerId] = sessionData
}

function initialiseSession(req: Request) {
  if (!req.session.recallsSessionData) {
    req.session.recallsSessionData = {}
  }
}
