import { Router, Request, Response, NextFunction } from 'express'
import { isBefore, isAfter, isEqual } from 'date-fns'
import _ from 'lodash'
import type { UAL } from 'models'
import { rtcDateSchema } from '../../schemas/recall/dates.schema'
import { validateWithZod } from '../../middleware/validation-middleware'
import { calculateUal } from '../../utils/utils'
import { sessionModelFields } from '../../helpers/recallSessionHelper'
import {
  getAdjustmentsToConsiderForValidationFromSession,
  getExistingAdjustmentsFromSession,
  getPrisonerFromSession,
  getRevocationDateFromSession,
  hasMultipleConflictingFromSession,
  hasMultipleUALTypeRecallConflictingFromSession,
  isManualCaseSelectionFromSession,
  getEligibleSentenceCountFromSession,
} from '../../helpers/migratedFormHelper'
import { AdjustmentDto, ConflictingAdjustments } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import logger from '../../../logger'

const router = Router()

router.get('/rtc-date', (req: Request, res: Response) => {
  const { prisoner } = res.locals
  const isEditRecall = res.locals.isEditRecall || false
  const { recallId } = res.locals

  const backLink = `/person/${prisoner.prisonerNumber}${isEditRecall ? `/recall/${recallId}/edit/edit-summary` : '/record-recall/revocation-date'}`

  res.render('pages/recall/base-question', {
    fields: {
      inPrisonAtRecall: {
        component: 'govukRadios',
        id: 'inPrisonAtRecall',
        name: 'inPrisonAtRecall',
        fieldset: {
          legend: {
            text: 'Was this person in prison when the recall was made?',
            classes: 'govuk-fieldset__legend--l',
            isPageHeading: true,
          },
        },
        items: [
          { text: 'Yes', value: 'true' },
          {
            text: 'No',
            value: 'false',
            conditional: {
              returnToCustodyDate: {
                component: 'govukDateInput',
                id: 'returnToCustodyDate',
                namePrefix: 'returnToCustodyDate',
                fieldset: {
                  legend: {
                    text: 'Date they were arrested',
                    classes: 'govuk-fieldset__legend--s',
                  },
                },
                hint: {
                  text: 'For example, 18 10 2007',
                },
                items: [
                  {
                    name: 'day',
                    classes: 'govuk-input--width-2',
                    value: req.session.formData?.['returnToCustodyDate-day'],
                  },
                  {
                    name: 'month',
                    classes: 'govuk-input--width-2',
                    value: req.session.formData?.['returnToCustodyDate-month'],
                  },
                  {
                    name: 'year',
                    classes: 'govuk-input--width-4',
                    value: req.session.formData?.['returnToCustodyDate-year'],
                  },
                ],
                nameForErrors: 'Arrest date',
              },
            },
          },
        ],
      },
    },
    values: req.session.formData || {},
    errors: req.session.formErrors || {},
    backLink,
    prisoner,
  })

  delete req.session.formErrors
})

function isRelevantAdjustment(adjustment: AdjustmentDto): { isRelevant: boolean; type?: string; ualType?: string } {
  if (adjustment.adjustmentType === 'REMAND') {
    return { isRelevant: true, type: 'REMAND' }
  }
  if (adjustment.adjustmentType === 'LAWFULLY_AT_LARGE') {
    return { isRelevant: true, type: 'LAWFULLY_AT_LARGE' }
  }

  if (adjustment.adjustmentType === 'UNLAWFULLY_AT_LARGE') {
    const ualType = adjustment.unlawfullyAtLarge?.type

    if (!ualType) {
      return { isRelevant: true, type: 'UAL' }
    }
    if (ualType !== 'RECALL') {
      return { isRelevant: true, type: 'UAL', ualType }
    }
  }

  return { isRelevant: false }
}

function identifyConflictingAdjustments(
  proposedUal: UAL,
  existingAdjustments?: AdjustmentDto[],
): ConflictingAdjustments {
  if (!existingAdjustments || existingAdjustments.length === 0) {
    return { exact: [], overlap: [], within: [] }
  }

  const getExactMatches = (adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] => {
    return adjustments.filter(adj => isEqual(adj.fromDate, proposed.firstDay) && isEqual(adj.toDate, proposed.lastDay))
  }

  const getAdjustmentsWithinProposed = (adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] => {
    return adjustments.filter(adj => {
      const startsSame = isEqual(adj.fromDate, proposed.firstDay)
      const endsSame = isEqual(adj.toDate, proposed.lastDay)
      const startsAfter = isAfter(adj.fromDate, proposed.firstDay)
      const endsBefore = isBefore(adj.toDate, proposed.lastDay)

      return (startsSame && endsBefore) || (startsAfter && endsBefore) || (startsAfter && endsSame)
    })
  }

  const getOverlappingAdjustments = (adjustments: AdjustmentDto[], proposed: UAL): AdjustmentDto[] => {
    return adjustments.filter(adj => isBefore(adj.fromDate, proposed.lastDay) && isAfter(adj.toDate, proposed.firstDay))
  }

  return {
    exact: getExactMatches(existingAdjustments, proposedUal),
    within: getAdjustmentsWithinProposed(existingAdjustments, proposedUal),
    overlap: getOverlappingAdjustments(existingAdjustments, proposedUal),
  }
}

// Middleware to combine date parts into a single field
function combineDateParts(req: Request, res: Response, next: NextFunction) {
  const day = req.body['returnToCustodyDate-day']
  const month = req.body['returnToCustodyDate-month']
  const year = req.body['returnToCustodyDate-year']

  if (day && month && year) {
    // Convert to YYYY-MM-DD format expected by the schema
    req.body.returnToCustodyDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  next()
}

router.post(
  '/rtc-date',
  combineDateParts,
  validateWithZod(rtcDateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = req.validatedData as { inPrisonAtRecall: string; returnToCustodyDate?: string }
      const revocationDate = getRevocationDateFromSession(req)
      const { prisoner } = res.locals
      const prisonerDetails = getPrisonerFromSession(req)

      if (validatedData.inPrisonAtRecall === 'false' && validatedData.returnToCustodyDate) {
        if (isBefore(new Date(validatedData.returnToCustodyDate), revocationDate)) {
          req.session.formErrors = {
            returnToCustodyDate: {
              type: 'validation',
              message: 'The arrest date must be on or after the revocation date',
            },
          }
          req.session.formValues = req.body
          res.redirect(req.originalUrl)
          return
        }
      }

      if (!req.session.formData) {
        req.session.formData = {}
      }

      req.session.formData.inPrisonAtRecall = validatedData.inPrisonAtRecall

      if (validatedData.inPrisonAtRecall === 'false' && validatedData.returnToCustodyDate) {
        req.session.formData.returnToCustodyDate = validatedData.returnToCustodyDate

        const rtcDate = new Date(validatedData.returnToCustodyDate)
        const ual = calculateUal(revocationDate, rtcDate)
        const proposedUal = calculateUal(revocationDate, rtcDate)

        const allExistingAdjustments: AdjustmentDto[] = getExistingAdjustmentsFromSession(req)
        const adjustmentsToConsider = getAdjustmentsToConsiderForValidationFromSession(
          req.session.formData || {},
          allExistingAdjustments,
        )

        const conflictingRecallUALAdjustments = adjustmentsToConsider.filter(adjustment => {
          return (
            isRelevantAdjustment(adjustment).isRelevant === false &&
            isBefore(adjustment.fromDate, proposedUal.lastDay) &&
            isAfter(adjustment.toDate, proposedUal.firstDay)
          )
        })

        const conflictingNonRecallUALAdjustments = adjustmentsToConsider.filter(adjustment => {
          return (
            isRelevantAdjustment(adjustment).isRelevant &&
            isBefore(adjustment.fromDate, proposedUal.lastDay) &&
            isAfter(adjustment.toDate, proposedUal.firstDay)
          )
        })

        const hasNoRecallUalConflicts = conflictingRecallUALAdjustments.length <= 1
        const hasNoOtherAdjustmentConflicts = conflictingNonRecallUALAdjustments.length === 0
        const hasConflicts = !hasNoRecallUalConflicts || !hasNoOtherAdjustmentConflicts

        if (conflictingRecallUALAdjustments.length > 1) {
          req.session.formData[sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL] = true
        }

        if (conflictingNonRecallUALAdjustments.length > 0) {
          req.session.formData[sessionModelFields.RELEVANT_ADJUSTMENTS] = conflictingNonRecallUALAdjustments
        }

        req.session.formData[sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS] = hasConflicts

        if (ual && !hasConflicts) {
          const ualToSave: UAL = {
            ...ual,
            nomisId: prisoner.prisonerNumber,
            bookingId: (prisonerDetails as { bookingId?: number })?.bookingId,
          }

          const conflictingAdjustments = identifyConflictingAdjustments(proposedUal, adjustmentsToConsider)
          const allConflicting = [
            ...conflictingAdjustments.exact,
            ...conflictingAdjustments.overlap,
            ...conflictingAdjustments.within,
          ]

          const relevantAdjustments = allConflicting
            .filter(adj => isRelevantAdjustment(adj).isRelevant)
            .filter((adj, index, self) => index === self.findIndex(t => t.id === adj.id))

          req.session.formData[sessionModelFields.CONFLICTING_ADJUSTMENTS] = conflictingAdjustments

          if (relevantAdjustments.length === 0) {
            if (Object.values(conflictingAdjustments).every(arr => arr.length === 0)) {
              req.session.formData[sessionModelFields.UAL_TO_CREATE] = ualToSave
              delete req.session.formData[sessionModelFields.UAL_TO_EDIT]
            } else if (conflictingAdjustments.exact.length === 1 || conflictingAdjustments.within.length === 1) {
              const existingAdjustment = _.first([...conflictingAdjustments.exact, ...conflictingAdjustments.within])
              const updatedUal: UAL = {
                adjustmentId: existingAdjustment.id,
                bookingId: existingAdjustment.bookingId,
                firstDay: ual.firstDay,
                lastDay: ual.lastDay,
                nomisId: existingAdjustment.person,
              }
              req.session.formData[sessionModelFields.UAL_TO_EDIT] = updatedUal
              delete req.session.formData[sessionModelFields.UAL_TO_CREATE]
            } else {
              const existingAdj = _.first(conflictingAdjustments.overlap)
              const updatedUal: UAL = {
                adjustmentId: existingAdj.id,
                bookingId: existingAdj.bookingId,
                firstDay: rtcDate,
                lastDay: existingAdj.toDate,
                nomisId: existingAdj.person,
              }
              req.session.formData[sessionModelFields.UAL_TO_CREATE] = ualToSave
              req.session.formData[sessionModelFields.UAL_TO_EDIT] = updatedUal
            }

            req.session.formData[sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS] = false
            delete req.session.formData[sessionModelFields.RELEVANT_ADJUSTMENTS]
          }
        }
      } else {
        delete req.session.formData.returnToCustodyDate
        delete req.session.formData[sessionModelFields.UAL]
        delete req.session.formData[sessionModelFields.UAL_TO_CREATE]
        delete req.session.formData[sessionModelFields.UAL_TO_EDIT]
      }

      let nextStep = `/person/${prisoner.prisonerNumber}/record-recall/check-sentences`

      // Debug logging for manual recall test
      const manualCaseSelection = isManualCaseSelectionFromSession(req)
      logger.info('RTC date navigation decision:', {
        prisonerNumber: prisoner.prisonerNumber,
        manualCaseSelection,
        hasMultipleUALConflict: hasMultipleUALTypeRecallConflictingFromSession(req),
        hasMultipleConflict: hasMultipleConflictingFromSession(req),
        eligibleSentenceCount: getEligibleSentenceCountFromSession(req),
        sessionData: req.session.formData,
      })

      if (hasMultipleUALTypeRecallConflictingFromSession(req) || hasMultipleConflictingFromSession(req)) {
        nextStep = `/person/${prisoner.prisonerNumber}/record-recall/conflicting-adjustments-interrupt`
      } else if (manualCaseSelection) {
        nextStep = `/person/${prisoner.prisonerNumber}/record-recall/manual-recall-intercept`
      } else if (getEligibleSentenceCountFromSession(req) === 0) {
        nextStep = `/person/${prisoner.prisonerNumber}/record-recall/no-sentences-interrupt`
      }

      // Ensure session is saved before redirecting
      req.session.save(err => {
        if (err) {
          logger.error('Error saving session:', err)
          return next(err)
        }
        return res.redirect(nextStep)
      })
    } catch (error) {
      logger.error('Error processing RTC date:', error)
      next(error)
    }
  },
)

export default router
