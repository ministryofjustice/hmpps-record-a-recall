// import { components } from './index'

// export type CreateResponse = components['schemas']['nomisDpsMapping']

export interface NomisSentenceId {
  nomisBookingId: number
  nomisSentenceSequence: number
}

export interface NomisDpsSentenceMapping {
  nomisSentenceId: {
    nomisSentenceSequence: number
    nomisBookingId: number
  }
  dpsSentenceId: string
}

export interface NomisDpsInfo {
  nomisBookingId: number
  nomisSentenceSequence: number
  dpsSentenceId: number
  label: string
  mappingType: 'DPS_CREATED'
  whenCreated: Date
}

export type DpsSentenceIds = string[]
