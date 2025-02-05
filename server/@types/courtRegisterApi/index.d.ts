/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/court-maintenance/id/{courtId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Update specified court details
     * @description Updates court information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    put: operations['updateCourt']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-maintenance/id/{courtId}/buildings/{buildingId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Update specified building details
     * @description Updates building information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    put: operations['updateBuilding']
    post?: never
    /**
     * Delete specified building
     * @description Deletes building information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    delete: operations['deleteBuilding']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-maintenance/id/{courtId}/buildings/{buildingId}/contacts/{contactId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Update specified building contact details
     * @description Updates contact information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    put: operations['updateContact']
    post?: never
    /**
     * Delete specified building contact details
     * @description Deletes contact information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    delete: operations['deleteContact']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-maintenance': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Add a new court
     * @description Adds a new court information, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    post: operations['insertCourt']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-maintenance/id/{courtId}/buildings': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Add a new building to a court
     * @description Adds a new building to court, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    post: operations['insertBuilding']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/court-maintenance/id/{courtId}/buildings/{buildingId}/contacts': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Add a new contact to a building
     * @description Adds a new contact to building, role required is ROLE_COURT_REGISTER__COURT_DETAILS__RW
     */
    post: operations['insertContact']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/admin/refresh-nomis-data': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['refreshNomisData']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/admin/refresh-data': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['refreshData']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get all active courts
     * @description All courts (active only)
     */
    get: operations['getActiveCourts']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/types': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get all types of court
     * @description All court types
     */
    get: operations['getCourtTypes']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/paged': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get page of courts
     * @description Page of courts
     */
    get: operations['getPageOfCourts']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/id/{courtId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get specified court
     * @description Information on a specific court
     */
    get: operations['getCourtFromId']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/id/{courtId}/buildings/main': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get the main building by court ID
     * @description Information on the main building by court ID
     */
    get: operations['findMainBuilding']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/id/{courtId}/buildings/id/{buildingId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get specified building
     * @description Information on a specific building
     */
    get: operations['getBuildingFromId']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/id/{courtId}/buildings/id/{buildingId}/contacts/id/{contactId}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get specified contact
     * @description Information on a specific contact
     */
    get: operations['getContactFromId']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/id/multiple': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get court by ids
     * @description Information on multiple courts
     */
    get: operations['getCourtsByIds']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/buildings/sub-code/{subCode}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get specified building by sub-code
     * @description Information on a specific building by sub-code
     */
    get: operations['getBuildingFromSubCode']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/courts/all': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get all active and inactive courts
     * @description All active/inactive courts
     */
    get: operations['getAllCourts']
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
    /** @description Court Update Record */
    UpdateCourtDto: {
      /**
       * @description Name of the court
       * @example Accrington Youth Court
       */
      courtName: string
      /**
       * @description Description of the court
       * @example Accrington Youth Court
       */
      courtDescription?: string
      /**
       * @description Type of court
       * @example COU
       */
      courtType: string
      /** @description Whether the court is still active */
      active: boolean
    }
    /** @description Building */
    BuildingDto: {
      /**
       * Format: int32
       * @description Unique ID of the building
       * @example 10000
       */
      id: number
      /**
       * @description Court Id for this building
       * @example ACCRYC
       */
      courtId: string
      /**
       * @description Sub location code for referencing building
       * @example AAABBB
       */
      subCode?: string
      /**
       * @description Address line 1
       * @example Crown House
       */
      addressLine1?: string
      /**
       * @description Address Line 2
       * @example 452
       */
      addressLine2?: string
      /**
       * @description Address Line 3
       * @example Swansea
       */
      addressLine3?: string
      /**
       * @description Address Line 4
       * @example West Cross
       */
      addressLine4?: string
      /**
       * @description Address Line 5
       * @example South Glamorgan
       */
      addressLine5?: string
      /**
       * @description Postcode
       * @example SA3 4HT
       */
      postcode?: string
      /** @description List of contacts for this building by type */
      contacts?: components['schemas']['ContactDto'][]
      /** @description Whether the building is active */
      active: boolean
    }
    /** @description Contact */
    ContactDto: {
      /**
       * Format: int32
       * @description Unique ID of the contact
       * @example 10000
       */
      id: number
      /**
       * @description Court Id for this contact
       * @example ACCRYC
       */
      courtId: string
      /**
       * Format: int32
       * @description Building Id for this contact
       * @example 12312
       */
      buildingId: number
      /**
       * @description Type of contact
       * @example TEL
       * @enum {string}
       */
      type: 'TEL' | 'FAX'
      /**
       * @description Details of the contact
       * @example 555
       */
      detail: string
    }
    /** @description Court Information */
    CourtDto: {
      /**
       * @description Court ID
       * @example ACCRYC
       */
      courtId: string
      /**
       * @description Name of the court
       * @example Accrington Youth Court
       */
      courtName: string
      /**
       * @description Description of the court
       * @example Accrington Youth Court
       */
      courtDescription?: string
      /** @description Type of court with description */
      type: components['schemas']['CourtTypeDto']
      /** @description Whether the court is still active */
      active: boolean
      /** @description List of buildings for this court entity */
      buildings: components['schemas']['BuildingDto'][]
    }
    /** @description Court Type */
    CourtTypeDto: {
      /**
       * @description Type of court
       * @example COU
       */
      courtType: string
      /**
       * @description Description of the type of court
       * @example County Court/County Divorce Ct
       */
      courtName: string
    }
    ErrorResponse: {
      /** Format: int32 */
      status: number
      /** Format: int32 */
      errorCode?: number
      userMessage?: string
      developerMessage?: string
      moreInfo?: string
      errors?: string[]
    }
    /** @description Building Update Record */
    UpdateBuildingDto: {
      /**
       * @description Address Line 1
       * @example Crown House
       */
      addressLine1?: string
      /**
       * @description Address Line 2
       * @example 452
       */
      addressLine2?: string
      /**
       * @description Address Line 3
       * @example Swansea
       */
      addressLine3?: string
      /**
       * @description Address Line 4
       * @example West Cross
       */
      addressLine4?: string
      /**
       * @description Address Line 5
       * @example South Glamorgan
       */
      addressLine5?: string
      /**
       * @description Postcode
       * @example SA3 4HT
       */
      postcode?: string
      /**
       * @description Sub location code for referencing building
       * @example AAABBB
       */
      subCode?: string
      /**
       * @description Whether the building is active
       * @default true
       * @example true
       */
      active: boolean
      /** @description List of contacts for this building by type, can only be used on a new court */
      contacts: components['schemas']['UpdateContactDto'][]
    }
    /** @description Contact */
    UpdateContactDto: {
      /**
       * @description Type of contact
       * @example TEL
       * @enum {string}
       */
      type: 'TEL' | 'FAX'
      /**
       * @description Details of the contact
       * @example 555
       */
      detail: string
    }
    /** @description Court Insert Record */
    InsertCourtDto: {
      /**
       * @description Court ID
       * @example ACCRYC
       */
      courtId: string
      /**
       * @description Name of the court
       * @example Accrington Youth Court
       */
      courtName: string
      /**
       * @description Description of the court
       * @example Accrington Youth Court
       */
      courtDescription?: string
      /**
       * @description Type of court
       * @example COU
       */
      courtType: string
      /** @description Whether the court is still active */
      active: boolean
      /** @description List of buildings for this court */
      buildings: components['schemas']['UpdateBuildingDto'][]
    }
    CourtDtoPage: {
      content?: components['schemas']['CourtDto'][]
      pageable?: components['schemas']['PageableObject']
      last?: boolean
      /** Format: int64 */
      totalElements?: number
      /** Format: int32 */
      totalPages?: number
      first?: boolean
      /** Format: int32 */
      size?: number
      /** Format: int32 */
      number?: number
      sort?: components['schemas']['SortObject']
      /** Format: int32 */
      numberOfElements?: number
      empty?: boolean
    }
    PageableObject: {
      /** Format: int64 */
      offset?: number
      sort?: components['schemas']['SortObject']
      /** Format: int32 */
      pageSize?: number
      paged?: boolean
      /** Format: int32 */
      pageNumber?: number
      unpaged?: boolean
    }
    SortObject: {
      empty?: boolean
      sorted?: boolean
      unsorted?: boolean
    }
    Pageable: {
      /** Format: int32 */
      page?: number
      /** Format: int32 */
      size?: number
      sort?: string[]
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
  updateCourt: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['UpdateCourtDto']
      }
    }
    responses: {
      /** @description Court Information Updated */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto']
        }
      }
      /** @description Information request to update court */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to make court update */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Court ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  updateBuilding: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['UpdateBuildingDto']
      }
    }
    responses: {
      /** @description Building Information Updated */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Information request to update building */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to make building update */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Building ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  deleteBuilding: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Building Information Deleted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to delete building */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Building ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  updateContact: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
        /**
         * @description Contact ID
         * @example 11111
         */
        contactId: number
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['UpdateContactDto']
      }
    }
    responses: {
      /** @description Building Contact Information Updated */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ContactDto']
        }
      }
      /** @description Information request to update contact */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to make contact update */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Contact ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  deleteContact: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
        /**
         * @description Contact ID
         * @example 11111
         */
        contactId: number
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Building Contact Information Deleted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ContactDto']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to delete contact */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Contact ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  insertCourt: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['InsertCourtDto']
      }
    }
    responses: {
      /** @description Court Information Inserted */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto']
        }
      }
      /** @description Information request to add a court */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to make court insert */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  insertBuilding: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['UpdateBuildingDto']
      }
    }
    responses: {
      /** @description Building Information Inserted */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Invalid request to add a building */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to make building insert */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  insertContact: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Contact ID
         * @example 11111
         */
        buildingId: number
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['UpdateContactDto']
      }
    }
    responses: {
      /** @description Contact Information Inserted */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ContactDto']
        }
      }
      /** @description Invalid request to add a contact */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Unauthorized to access this endpoint */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Incorrect permissions to add contact insert */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  refreshNomisData: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description No Content */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
    }
  }
  refreshData: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description No Content */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
    }
  }
  getActiveCourts: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description All Active Court Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto'][]
        }
      }
    }
  }
  getCourtTypes: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description All Types of courts returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtTypeDto'][]
        }
      }
    }
  }
  getPageOfCourts: {
    parameters: {
      query?: {
        /**
         * @description Active?
         * @example true
         */
        active?: boolean
        /**
         * @description Court Type
         * @example CRN
         */
        courtTypeIds?: string[]
        /**
         * @description Text search
         * @example Sheffield
         */
        textSearch?: string
        pageable?: components['schemas']['Pageable']
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description All Court Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDtoPage'][]
        }
      }
    }
  }
  getCourtFromId: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Court Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto']
        }
      }
      /** @description Incorrect request to get court information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Court ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  findMainBuilding: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court Id
         * @example BRMNCC
         */
        courtId: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Building Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Incorrect request to get building information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Building SubCode not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  getBuildingFromId: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example BRMNCC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Building Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Incorrect request to get building information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Building ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  getContactFromId: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Court ID
         * @example ACCRYC
         */
        courtId: string
        /**
         * @description Building ID
         * @example 234231
         */
        buildingId: number
        /**
         * @description Contact ID
         * @example 11111
         */
        contactId: number
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Contact Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ContactDto']
        }
      }
      /** @description Incorrect request to get contact information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Contact ID not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  getCourtsByIds: {
    parameters: {
      query: {
        /**
         * @description CourtIDs
         * @example ACCRYC
         */
        courtIds: string[]
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Court Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto'][]
        }
      }
      /** @description Incorrect request to get court information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  getBuildingFromSubCode: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Building Sub Code
         * @example BCCACC
         */
        subCode: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Building Information Returned */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BuildingDto']
        }
      }
      /** @description Incorrect request to get building information */
      400: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
      /** @description Building SubCode not found */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ErrorResponse']
        }
      }
    }
  }
  getAllCourts: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description All Court Information Returned (Active only) */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CourtDto'][]
        }
      }
    }
  }
}
