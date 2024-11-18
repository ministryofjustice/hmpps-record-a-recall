/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/court-case/{courtCaseUuid}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve court case details
     * @description This endpoint will retrieve court case details
     */
    get: operations['getCourtCaseDetails']
    /**
     * Create Court case
     * @description This endpoint will create a court case
     */
    put: operations['putCourtCase']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-appearance/{appearanceUuid}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve court appearance details
     * @description This endpoint will retrieve court appearance details
     */
    get: operations['getCourtAppearanceDetails']
    /**
     * Create Court appearance
     * @description This endpoint will create a court appearance in a given court case
     */
    put: operations['updateCourtAppearance']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/recall': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Create a recall
     * @description This endpoint will create a recall
     */
    post: operations['createRecall']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-case': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Create Court case
     * @description This endpoint will create a court case
     */
    post: operations['createCourtCase']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-appearance': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Create Court appearance
     * @description This endpoint will create a court appearance in a given court case
     */
    post: operations['createCourtAppearance']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/recall/{recallUuid}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve a recall
     * @description This endpoint will retrieve the details of a recall
     */
    get: operations['getRecall']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/recall/person/{prisonerId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve all recalls for a person
     * @description This endpoint will retrieve  all recalls for a person
     */
    get: operations['getRecallsByPrisonerId']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/person/{prisonerId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve person details
     * @description This endpoint will retrieve person details
     */
    get: operations['getPersonDetails']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-case/{courtCaseUuid}/latest-appearance': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve latest court appearance of court case
     * @description This endpoint will retrieve latest court appearance of court case
     */
    get: operations['getLatestAppearanceDetails']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-case/search': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve all court cases for person
     * @description This endpoint will retrieve all court cases for a person
     */
    get: operations['searchCourtCases']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/charge/{chargeUuid}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Retrieve charge details
     * @description This endpoint will retrieve charge details
     */
    get: operations['getChargeDetails']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    CreateCharge: {
      /** Format: uuid */
      chargeUuid?: string
      offenceCode: string
      /** Format: date */
      offenceStartDate: string
      /** Format: date */
      offenceEndDate?: string
      outcome: string
      terrorRelated?: boolean
      sentence?: components['schemas']['CreateSentence']
    }
    CreateCourtAppearance: {
      courtCaseUuid?: string
      /** Format: uuid */
      appearanceUuid?: string
      outcome: string
      courtCode: string
      courtCaseReference?: string
      /** Format: date */
      appearanceDate: string
      warrantId?: string
      warrantType: string
      /** Format: int32 */
      taggedBail?: number
      overallSentenceLength?: components['schemas']['CreatePeriodLength']
      nextCourtAppearance?: components['schemas']['CreateNextCourtAppearance']
      charges: components['schemas']['CreateCharge'][]
    }
    CreateCourtCase: {
      prisonerId: string
      appearances: components['schemas']['CreateCourtAppearance'][]
    }
    CreateNextCourtAppearance: {
      /** Format: date */
      appearanceDate: string
      /** @example 15:31:31.092225418 */
      appearanceTime?: string
      courtCode: string
      appearanceType: string
    }
    CreatePeriodLength: {
      /** Format: int32 */
      years?: number
      /** Format: int32 */
      months?: number
      /** Format: int32 */
      weeks?: number
      /** Format: int32 */
      days?: number
      periodOrder: string
    }
    CreateSentence: {
      /** Format: uuid */
      sentenceUuid?: string
      chargeNumber: string
      custodialPeriodLength: components['schemas']['CreatePeriodLength']
      extendedLicensePeriodLength?: components['schemas']['CreatePeriodLength']
      sentenceServeType: string
      consecutiveToChargeNumber?: string
      sentenceType: string
    }
    CreateCourtCaseResponse: {
      courtCaseUuid: string
    }
    CreateCourtAppearanceResponse: {
      /** Format: uuid */
      appearanceUuid: string
    }
    CreateRecall: {
      prisonerId: string
      /** Format: date */
      recallDate: string
      /** Format: date */
      returnToCustodyDate: string
      /** @enum {string} */
      recallType:
        | 'FOURTEEN_DAY_FIXED_TERM_RECALL'
        | 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL'
        | 'STANDARD_RECALL'
        | 'HDC_RECALL'
        | string // TODO Fix ts complaining about pulling this from sessionModel
      createdByUsername: string
    }
    CreateRecallResponse: {
      /** Format: uuid */
      recallUuid: string
    }
    Recall: {
      /** Format: uuid */
      recallUniqueIdentifier: string
      prisonerId: string
      /** Format: date */
      recallDate: string
      /** Format: date */
      returnToCustodyDate: string
      /** @enum {string} */
      recallType:
        | 'FOURTEEN_DAY_FIXED_TERM_RECALL'
        | 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL'
        | 'STANDARD_RECALL'
        | 'HDC_RECALL'
      /** Format: date-time */
      createdAt: string
      createdByUsername: string
    }
    PersonDetails: {
      personId: string
      firstName: string
      lastName: string
      establishment?: string
      cellNumber?: string
      /** Format: date */
      dateOfBirth: string
      pncNumber?: string
      status?: string
    }
    Charge: {
      /** Format: uuid */
      chargeUuid: string
      offenceCode: string
      /** Format: date */
      offenceStartDate: string
      /** Format: date */
      offenceEndDate?: string
      outcome: string
      terrorRelated?: boolean
      sentence?: components['schemas']['Sentence']
    }
    CourtAppearance: {
      /** Format: uuid */
      appearanceUuid: string
      outcome: string
      courtCode: string
      courtCaseReference?: string
      /** Format: date */
      appearanceDate: string
      warrantId?: string
      warrantType: string
      /** Format: int32 */
      taggedBail?: number
      nextCourtAppearance?: components['schemas']['NextCourtAppearance']
      charges: components['schemas']['Charge'][]
      overallSentenceLength?: components['schemas']['PeriodLength']
    }
    CourtCase: {
      prisonerId: string
      courtCaseUuid: string
      latestAppearance: components['schemas']['CourtAppearance']
      appearances: components['schemas']['CourtAppearance'][]
    }
    NextCourtAppearance: {
      /** Format: date */
      appearanceDate: string
      /** @example 15:31:31.092225418 */
      appearanceTime?: string
      courtCode: string
      appearanceType: string
    }
    PeriodLength: {
      /** Format: int32 */
      years?: number
      /** Format: int32 */
      months?: number
      /** Format: int32 */
      weeks?: number
      /** Format: int32 */
      days?: number
      periodOrder: string
    }
    Sentence: {
      /** Format: uuid */
      sentenceUuid: string
      chargeNumber: string
      custodialPeriodLength: components['schemas']['PeriodLength']
      extendedLicensePeriodLength?: components['schemas']['PeriodLength']
      sentenceServeType: string
      consecutiveToChargeNumber?: string
      sentenceType: string
    }
    Pageable: {
      /** Format: int32 */
      page?: number
      /** Format: int32 */
      size?: number
      sort?: string[]
    }
    PageCourtCase: {
      /** Format: int64 */
      totalElements?: number
      /** Format: int32 */
      totalPages?: number
      first?: boolean
      last?: boolean
      /** Format: int32 */
      size?: number
      content?: components['schemas']['CourtCase'][]
      /** Format: int32 */
      number?: number
      sort?: components['schemas']['SortObject'][]
      /** Format: int32 */
      numberOfElements?: number
      pageable?: components['schemas']['PageableObject']
      empty?: boolean
    }
    PageableObject: {
      /** Format: int64 */
      offset?: number
      sort?: components['schemas']['SortObject'][]
      /** Format: int32 */
      pageSize?: number
      /** Format: int32 */
      pageNumber?: number
      paged?: boolean
      unpaged?: boolean
    }
    SortObject: {
      direction?: string
      nullHandling?: string
      ascending?: boolean
      property?: string
      ignoreCase?: boolean
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  getCourtCaseDetails: {
    parameters: {
      query?: never
      header?: never
      path: {
        courtCaseUuid: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns court case details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtCase']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtCase']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtCase']
        }
      }
      /** @description Not found if no court case at uuid */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtCase']
        }
      }
    }
  }
  putCourtCase: {
    parameters: {
      query?: never
      header?: never
      path: {
        courtCaseUuid: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateCourtCase']
      }
    }
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
      /** @description Returns court case UUID */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
    }
  }
  getCourtAppearanceDetails: {
    parameters: {
      query?: never
      header?: never
      path: {
        appearanceUuid: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns court appearance details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Not found if no court appearance at uuid */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
    }
  }
  updateCourtAppearance: {
    parameters: {
      query?: never
      header?: never
      path: {
        appearanceUuid: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateCourtAppearance']
      }
    }
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
      /** @description Returns court case UUID */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
    }
  }
  createRecall: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateRecall']
      }
    }
    responses: {
      /** @description Returns recall UUID */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateRecallResponse']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateRecallResponse']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateRecallResponse']
        }
      }
    }
  }
  createCourtCase: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateCourtCase']
      }
    }
    responses: {
      /** @description Returns court case UUID */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtCaseResponse']
        }
      }
    }
  }
  createCourtAppearance: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateCourtAppearance']
      }
    }
    responses: {
      /** @description Returns court case UUID */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CreateCourtAppearanceResponse']
        }
      }
    }
  }
  getRecall: {
    parameters: {
      query?: never
      header?: never
      path: {
        recallUuid: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns recall details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall']
        }
      }
      /** @description Not found if no recall uuid */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall']
        }
      }
    }
  }
  getRecallsByPrisonerId: {
    parameters: {
      query?: never
      header?: never
      path: {
        prisonerId: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns all recalls for person */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall'][]
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall'][]
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Recall'][]
        }
      }
    }
  }
  getPersonDetails: {
    parameters: {
      query?: never
      header?: never
      path: {
        prisonerId: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns person details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PersonDetails']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PersonDetails']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PersonDetails']
        }
      }
    }
  }
  getLatestAppearanceDetails: {
    parameters: {
      query?: never
      header?: never
      path: {
        courtCaseUuid: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns latest appearance details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
      /** @description Not found if no court case at uuid */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtAppearance']
        }
      }
    }
  }
  searchCourtCases: {
    parameters: {
      query: {
        prisonerId: string
        pageable: components['schemas']['Pageable']
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns court cases */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PageCourtCase']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PageCourtCase']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PageCourtCase']
        }
      }
    }
  }
  getChargeDetails: {
    parameters: {
      query?: never
      header?: never
      path: {
        chargeUuid: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Returns charge details */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Charge']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Charge']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Charge']
        }
      }
      /** @description Not found if no charge at uuid */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Charge']
        }
      }
    }
  }
}
