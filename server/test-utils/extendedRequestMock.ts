/**
 * Test utility to create ExtendedRequest mocks for controller tests
 * Provides proper typing for form.options.fields requirement
 */

import { ExtendedRequest } from '../controllers/base/ExpressBaseController'

/**
 * Creates a mock ExtendedRequest object for testing
 * Ensures form.options.fields is properly typed
 */
export function createExtendedRequestMock(overrides: any = {}): ExtendedRequest {
  const defaultReq = {
    params: {},
    session: {
      formData: {},
    },
    journeyModel: {
      attributes: {
        lastVisited: '/previous-page',
      },
    },
    flash: jest.fn().mockReturnValue([]),
    body: {},
    form: {
      values: {},
      options: {
        fields: {}, // Required by FormOptions interface
        allFields: {},
      },
    },
    services: {},
    originalUrl: '',
  }

  // Deep merge overrides with defaults
  const mergeDeep = (target: any, source: any) => {
    const output = { ...target }
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = mergeDeep(target[key], source[key])
          }
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    return output
  }

  const isObject = (item: any) => {
    return item && typeof item === 'object' && !Array.isArray(item)
  }

  return mergeDeep(defaultReq, overrides) as ExtendedRequest
}
