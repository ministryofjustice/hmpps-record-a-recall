import jwt from 'jsonwebtoken'
import { Response } from 'superagent'

import { stubFor, getMatchingRequests } from './wiremock'
import tokenVerification from './tokenVerification'

interface UserToken {
  name?: string
  roles?: string[]
}

const createToken = (userToken: UserToken) => {
  // authorities in the session are always prefixed by ROLE.
  const authorities = userToken.roles?.map(role => (role.startsWith('ROLE_') ? role : `ROLE_${role}`)) || []
  const payload = {
    name: userToken.name || 'john smith',
    user_name: 'USER1',
    scope: ['read'],
    auth_source: 'nomis',
    authorities,
    jti: '83b50a10-cca6-41db-985f-e87efb303ddb',
    client_id: 'clientid',
  }

  return jwt.sign(payload, 'secret', { expiresIn: '1h' })
}

const getSignInUrl = (): Promise<string> =>
  getMatchingRequests({
    method: 'GET',
    urlPath: '/auth/oauth/authorize',
  }).then(data => {
    const { requests } = data.body
    // Handle case where no requests have been made yet
    if (!requests || requests.length === 0) {
      // Return a default sign-in URL with a state parameter
      return `/sign-in/callback?code=codexxxx&state=defaultState`
    }
    const lastRequest = requests[requests.length - 1]
    // Safely access queryParams with fallback
    const stateValue = lastRequest?.queryParams?.state?.values?.[0] || 'defaultState'
    return `/sign-in/callback?code=codexxxx&state=${stateValue}`
  })

const favicon = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/favicon.ico',
    },
    response: {
      status: 200,
    },
  })

const ping = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/auth/health/ping',
    },
    response: {
      status: 200,
    },
  })

const redirect = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/auth/oauth/authorize\\?response_type=code&redirect_uri=.+?&state=(.+?)&client_id=clientid',
    },
    response: {
      status: 302,
      headers: {
        Location: 'http://localhost:3007/sign-in/callback?code=codexxxx&state={{request.query.state}}',
      },
      transformers: ['response-template'],
    },
  })

const signOut = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/auth/sign-out.*',
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: '<html><body>Sign in page<h1>Sign in</h1></body></html>',
    },
  })

const manageDetails = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/auth/account-details.*',
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: '<html><body><h1>Your account details</h1></body></html>',
    },
  })

const token = (userToken: UserToken) =>
  stubFor({
    request: {
      method: 'POST',
      urlPattern: '/auth/oauth/token',
      bodyPatterns: [
        {
          contains: 'grant_type=authorization_code',
        },
      ],
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
      jsonBody: {
        access_token: createToken(userToken),
        token_type: 'bearer',
        user_name: 'USER1',
        expires_in: 599,
        scope: 'read',
        internalUser: true,
      },
    },
  })

const systemToken = () =>
  stubFor({
    request: {
      method: 'POST',
      urlPattern: '/auth/oauth/token',
      bodyPatterns: [
        {
          contains: 'grant_type=client_credentials',
        },
      ],
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
      jsonBody: {
        access_token: createToken({ roles: ['ROLE_SYSTEM'] }),
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'read write',
        sub: 'hmpps-record-a-recall',
        auth_source: 'none',
        jti: 'system-token-jti',
      },
    },
  })

export default {
  getSignInUrl,
  stubAuthPing: ping,
  stubAuthManageDetails: manageDetails,
  stubSystemToken: systemToken,
  stubSignIn: (
    userToken: UserToken = {
      roles: [
        'ROLE_REMAND_AND_SENTENCING',
        'ROLE_RELEASE_DATES_CALCULATOR',
        'ROLE_ADJUSTMENTS_MAINTAINER',
        'ROLE_RECALL_MAINTAINER',
      ],
    },
  ): Promise<[Response, Response, Response, Response, Response, Response]> =>
    Promise.all([
      favicon(),
      redirect(),
      signOut(),
      token(userToken),
      tokenVerification.stubVerifyToken(),
      systemToken(),
    ]),
}
