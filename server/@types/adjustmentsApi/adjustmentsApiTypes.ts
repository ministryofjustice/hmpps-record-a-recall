import { components } from './index'

export type CreateResponse = components['schemas']['CreateResponseDto']
export type AdjustmentDto = components['schemas']['AdjustmentDto']
export type UnlawfullyAtLarge = components['schemas']['UnlawfullyAtLargeDto']

export type ConflictingAdjustments = {
  exact: AdjustmentDto[]
  overlap: AdjustmentDto[]
  within: AdjustmentDto[]
}
