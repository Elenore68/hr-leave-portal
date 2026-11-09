import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js'
import { getConfig } from './config'

export class NewPasswordRequiredError extends Error {
  constructor() {
    super(
      'A new password is required for this account. Ask an administrator to set a permanent password, then sign in again.',
    )
    this.name = 'NewPasswordRequiredError'
  }
}

function pool(): CognitoUserPool {
  const { userPoolId, userPoolClientId } = getConfig()
  return new CognitoUserPool({ UserPoolId: userPoolId, ClientId: userPoolClientId })
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  const user = new CognitoUser({ Username: email, Pool: pool() })
  const details = new AuthenticationDetails({ Username: email, Password: password })
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (err: { message?: string }) =>
        reject(new Error(err?.message ?? 'Sign in failed.')),
      newPasswordRequired: () => reject(new NewPasswordRequiredError()),
    })
  })
}

export function signOut(): void {
  const user = pool().getCurrentUser()
  if (user) user.signOut()
}

/** Resolves the current valid session (refreshing if needed) or null. */
export function getSession(): Promise<CognitoUserSession | null> {
  const user = pool().getCurrentUser()
  if (!user) return Promise.resolve(null)
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      resolve(!err && session && session.isValid() ? session : null)
    })
  })
}

/** ID token: used for the REST API (Cognito authorizer). */
export async function getIdToken(): Promise<string | null> {
  const s = await getSession()
  return s ? s.getIdToken().getJwtToken() : null
}

/** Access token: used for the AgentCore runtime (Cognito JWT authorizer). */
export async function getAccessToken(): Promise<string | null> {
  const s = await getSession()
  return s ? s.getAccessToken().getJwtToken() : null
}

export async function getUserEmail(): Promise<string | null> {
  const s = await getSession()
  if (!s) return null
  const payload = s.getIdToken().payload as Record<string, unknown>
  return (payload.email as string) ?? (payload['cognito:username'] as string) ?? null
}
