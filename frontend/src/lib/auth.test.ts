import { beforeEach, describe, expect, it, vi } from 'vitest'

const signOutMock = vi.fn()
vi.mock('amazon-cognito-identity-js', () => {
  class CognitoUserPool {
    getCurrentUser() {
      return { signOut: signOutMock }
    }
  }
  return {
    CognitoUserPool,
    CognitoUser: class {},
    AuthenticationDetails: class {},
  }
})

import { signOut } from './auth'
import { setConfigForTests } from './config'

describe('auth.signOut', () => {
  beforeEach(() => {
    signOutMock.mockClear()
    setConfigForTests({
      apiUrl: 'x',
      userPoolId: 'p',
      userPoolClientId: 'c',
      region: 'r',
      agentRuntimeArn: 'a',
    })
  })

  it('clears the current Cognito session', () => {
    signOut()
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })
})
