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
