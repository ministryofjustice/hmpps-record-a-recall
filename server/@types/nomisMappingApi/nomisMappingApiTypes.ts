// import { components } from './index'

// export type CreateResponse = components['schemas']['nomisDpsMapping']

export interface NomisSentenceId {
  nomisBookingId: number
  nomisSentenceSequence: number
}

export interface NomisDpsSentenceMapping {
  nomisBookingId: number
  nomisSentenceSequence: number
  dpsSentenceId: string
}
