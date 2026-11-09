import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from './config'

const valid = {
  apiUrl: 'https://api.example.com/prod/',
  userPoolId: 'us-east-1_abc',
  userPoolClientId: 'client123',
  region: 'us-east-1',
  agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:123:runtime/hrAgent-1',
}

function stubFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) }),
  )
}

describe('loadConfig', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the validated config', async () => {
    stubFetch(valid)
    const cfg = await loadConfig()
    expect(cfg.userPoolId).toBe('us-east-1_abc')
    expect(cfg.agentEndpoint).toBeUndefined()
  })

  it('throws naming the missing keys', async () => {
    stubFetch({ apiUrl: 'x' })
    await expect(loadConfig()).rejects.toThrow(/missing required keys: .*userPoolId/)
  })
})
