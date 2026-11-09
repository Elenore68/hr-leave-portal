export interface AppConfig {
  apiUrl: string
  userPoolId: string
  userPoolClientId: string
  region: string
  agentRuntimeArn: string
  agentEndpoint?: string
}

const REQUIRED_KEYS = [
  'apiUrl',
  'userPoolId',
  'userPoolClientId',
  'region',
  'agentRuntimeArn',
] as const

let cached: AppConfig | null = null

/** Loads and validates /config.json (generated at deploy time or placed in public/ for local dev). */
export async function loadConfig(url = '/config.json'): Promise<AppConfig> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store' })
  } catch {
    throw new Error('Could not load /config.json. Check your network connection.')
  }
  if (!res.ok) {
    throw new Error(`Could not load /config.json (HTTP ${res.status}).`)
  }
  let data: Record<string, unknown>
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    throw new Error('/config.json is not valid JSON.')
  }
  const missing = REQUIRED_KEYS.filter(
    (k) => typeof data[k] !== 'string' || (data[k] as string).trim() === '',
  )
  if (missing.length > 0) {
    throw new Error(`/config.json is missing required keys: ${missing.join(', ')}`)
  }
  const config: AppConfig = {
    apiUrl: data.apiUrl as string,
    userPoolId: data.userPoolId as string,
    userPoolClientId: data.userPoolClientId as string,
    region: data.region as string,
    agentRuntimeArn: data.agentRuntimeArn as string,
    agentEndpoint:
      typeof data.agentEndpoint === 'string' && data.agentEndpoint ? data.agentEndpoint : undefined,
  }
  cached = config
  return config
}

export function getConfig(): AppConfig {
  if (!cached) throw new Error('Configuration has not been loaded yet.')
  return cached
}

/** Test helper. */
export function setConfigForTests(config: AppConfig | null): void {
  cached = config
}
