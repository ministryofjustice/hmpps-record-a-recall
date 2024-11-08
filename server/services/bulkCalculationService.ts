import PrisonerService from './prisonerService'
import BulkTemporaryCalculationRow from '../model/BulkTemporaryCalculationRow'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
  ValidationMessage,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import RecallService from './recallService'
import logger from '../../logger'
import { components } from '../@types/prisonerSearchApi'

export default class BulkCalculationService {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
  ) {}

  /* eslint-disable */
  public async runCalculations(
    prisoners: PrisonerSearchApiPrisoner[],
    username: string,
    log: boolean,
  ): Promise<BulkTemporaryCalculationRow[]> {
    const csvData: BulkTemporaryCalculationRow[] = []
    if (log) {
      console.log('logging to console')
    }
    let bookingId: string
    let prisonerDetails: PrisonerSearchApiPrisoner
    let idNum = 0
    const total = prisoners.length
    for (const prisoner of prisoners) {
      console.log('----------------')
      logger.info(`${++idNum} of ${total}`)

      let validation: ValidationMessage[] = []
      try {
        validation = await this.prisonerService.performCrdsValidation(prisoner.prisonerNumber, username)

        bookingId = prisoner.bookingId

        await this.prisonerService
          .getTemporaryCalculation(prisoner.prisonerNumber, username)
          .then(async latestCalc => {
            //get calculation
            const { calculationRequestId } = latestCalc
            const sentencesAndReleaseDates = calculationRequestId
              ? await this.prisonerService.getSentencesAndReleaseDates(calculationRequestId, username)
              : undefined

            const calculationBreakdown = calculationRequestId
              ? await this.recallService.getCalculationBreakdown(calculationRequestId, username)
              : undefined

            if (log) {
              console.log('Temporary Calculation:')
              console.log(JSON.stringify(latestCalc))
              console.log('')
              console.log('Breakdown:')
              console.log(JSON.stringify(calculationBreakdown))
              console.log('')
              console.log('Sentences:')
              console.log(JSON.stringify(sentencesAndReleaseDates))
              console.log('----------------')
            }

            for (const sentence of sentencesAndReleaseDates) {
              csvData.push(
                this.addRow(
                  prisoner.prisonerNumber,
                  bookingId,
                  prisonerDetails,
                  latestCalc,
                  calculationBreakdown,
                  sentence,
                  null,
                  validation,
                ),
              )
            }
          })
          .catch(error => {
            csvData.push(this.addErrorRow(prisoner.prisonerNumber, bookingId, error.data.userMessage, validation))
          })
      } catch (ex) {
        csvData.push(this.addErrorRow(prisoner.prisonerNumber, bookingId, ex.message, validation))
      }
    }
    return csvData
  }

  /* eslint-enable */
  private addErrorRow(
    nomisId: string,
    bookingId: string,
    error: string,
    validation?: ValidationMessage[],
  ): BulkTemporaryCalculationRow {
    return {
      NOMIS_ID: nomisId,
      CALCULATION_PERMITTED: this.passedValidation(validation),
      CALCULATION_NOT_PERMITTED_REASON: this.getValidationMessages(validation).toString(),
      ACTIVE_BOOKING_ID: bookingId,
      ERROR_TEXT: error,
    } as unknown as BulkTemporaryCalculationRow
  }

  private addRow(
    nomisId: string,
    bookingId: string,
    prisoner?: PrisonerSearchApiPrisoner,
    temporaryCalculation?: CalculatedReleaseDates,
    breakdowns?: CalculationBreakdown,
    sentence?: SentenceAndOffenceWithReleaseArrangements,
    error?: Error,
    validation?: ValidationMessage[],
  ): BulkTemporaryCalculationRow {
    try {
      const custodyTerm = this.getCustodialTerm(sentence.terms)
      const licenseTerm = this.getLicenceTerm(sentence.terms)
      let dates
      let consecutive: boolean

      dates = breakdowns.concurrentSentences.find(b => {
        return b.caseSequence === sentence.caseSequence && b.lineSequence === sentence.lineSequence
      })?.dates

      if (
        !dates &&
        breakdowns.consecutiveSentence?.sentenceParts.some(
          b => b.caseSequence === sentence.caseSequence && b.lineSequence === sentence.lineSequence,
        )
      ) {
        consecutive = true
        dates = breakdowns.consecutiveSentence.dates
      }

      const validationMessages: string[] = this.getValidationMessages(validation)

      return {
        IDENTIFIER: temporaryCalculation.calculationRequestId,
        NOMIS_ID: nomisId,
        VALIDATION_PASSED: this.passedValidation(validation),
        VALIDATION_MESSAGES: validationMessages.toString(),
        ACTIVE_BOOKING_ID: bookingId,
        AGENCY_LOCATION_ID: prisoner?.prisonId,

        CASE_SEQUENCE: sentence.caseSequence,
        LINE_SEQUENCE: sentence.lineSequence,

        OFFENCE_DESCRIPTION: sentence.offence.offenceDescription,
        OFFENCE_START: sentence.offence.offenceStartDate,
        OFFENCE_END: sentence.offence.offenceEndDate,
        CJA_CODE: sentence.offence.offenceCode,
        SENTENCE_CALC_TYPE: sentence.sentenceCalculationType,
        SENTENCE_TYPE: sentence.sentenceTypeDescription,
        SENTENCE_DATE: sentence.sentenceDate,
        CUSTODIAL_TERM: custodyTerm,
        LICENSE_PERIOD: licenseTerm,
        CONCURRENT_OR_CONSECUTIVE: consecutive ? 'CONSECUTIVE' : 'CONCURRENT',
        UNADJUSTED_LED: dates?.LED?.unadjusted || '',
        ADJUSTED_LED: dates?.LED?.adjusted || '',
        UNADJUSTED_SLED: dates?.SLED?.unadjusted || '',
        ADJUSTED_SLED: dates?.SLED?.adjusted || '',
        UNADJUSTED_CRD: dates?.CRD?.unadjusted || '',
        ADJUSTED_CRD: dates?.CRD?.adjusted || '',
        UNADJUSTED_SED: dates?.SED?.unadjusted || '',
        ADJUSTED_SED: dates?.SED?.adjusted || '',
        UNADJUSTED_APPD: dates?.APPD?.unadjusted || '',
        ADJUSTED_APPD: dates?.APPD?.adjusted || '',
        UNADJUSTED_HDCAD: dates?.HDCAD?.unadjusted || '',
        ADJUSTED_HDCAD: dates?.HDCAD?.adjusted || '',
        TARIFF: '',
        OVERALL_SLED: temporaryCalculation.dates?.SLED || '',
        OVERALL_CRD: temporaryCalculation.dates?.CRD || '',
        ARD: temporaryCalculation.dates?.ARD || '',
        MTD: temporaryCalculation.dates?.MTD || '',
        HDCED: temporaryCalculation.dates?.HCED || '',
        HDCAD: temporaryCalculation.dates?.HCAD || '',
        ESED: temporaryCalculation.dates?.ESED || '',
        PPRD: temporaryCalculation.dates?.PPRD || '',
        PED: temporaryCalculation.dates?.PED || '',

        ERROR_CODE: null,
        ERROR_TEXT: error?.message,
      }
    } catch (e) {
      return this.addErrorRow(nomisId, bookingId, e, validation)
    }
  }

  private getValidationMessages(validationMessages: ValidationMessage[]): string[] {
    return [...new Set(validationMessages.map(v => v.message))]
  }

  private passedValidation(validationMessages: ValidationMessage[]): string {
    return validationMessages.length === 0 ? 'TRUE' : 'FALSE'
  }

  // @ts-expect-error SentenceTerms does exist
  private getCustodialTerm(terms: components['schemas']['SentenceTerms'][]): string {
    return this.getTerm(terms, 'IMP')
  }

  // @ts-expect-error SentenceTerms does exist
  private getLicenceTerm(terms: components['schemas']['SentenceTerms'][]): string {
    return this.getTerm(terms, 'LIC')
  }

  // @ts-expect-error SentenceTerms does exist
  private getTerm(terms: components['schemas']['SentenceTerms'][], type: string): string {
    const term = terms?.find(t => t.code === type)

    return term ? `${term.years}Y,${term.months}M,${term.weeks}W,${term.days}D` : 'N/A'
  }
}
