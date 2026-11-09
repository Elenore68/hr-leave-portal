import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./auth', () => ({ getAccessToken: vi.fn().mockResolvedValue('ACCESS.TOKEN') }))

import { AgentError, invokeAgent, newSessionId } from './agent'
import { setConfigForTests } from './config'

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(enc.encode(c)))
      controller.close()
    },
  })
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = []
  for await (const c of gen) out.push(c)
  return out
}

describe('agent client', () => {
  beforeEach(() => {
    setConfigForTests({
      apiUrl: 'x',
      userPoolId: 'p',
      userPoolClientId: 'c',
      region: 'us-east-1',
      agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:123:runtime/hrAgent-1',
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('builds the URL, headers and payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf(['hi']) })
    vi.stubGlobal('fetch', fetchMock)
    const sessionId = newSessionId()
    await collect(invokeAgent({ prompt: 'Hello', actorId: 'a@b.com', sessionId }))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/' +
        encodeURIComponent('arn:aws:bedrock-agentcore:us-east-1:123:runtime/hrAgent-1') +
        '/invocations?qualifier=DEFAULT',
    )
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer ACCESS.TOKEN')
    expect(headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id']).toBe(sessionId)
    expect(JSON.parse(init.body as string)).toEqual({ prompt: 'Hello', actorId: 'a@b.com' })
  })

  it('yields stream chunks in order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf(['Hel', 'lo ', 'there']) }),
    )
    const chunks = await collect(invokeAgent({ prompt: 'x', actorId: 'a', sessionId: newSessionId() }))
    expect(chunks.join('')).toBe('Hello there')
  })

  it('decodes SSE data lines', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: streamOf(['data: "Hel', 'lo"\n\ndata: " world"\n\n']),
      }),
    )
    const chunks = await collect(invokeAgent({ prompt: 'x', actorId: 'a', sessionId: newSessionId() }))
    expect(chunks.join('')).toBe('Hello world')
  })

  it('maps network failure to a readable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(
      collect(invokeAgent({ prompt: 'x', actorId: 'a', sessionId: newSessionId() })),
    ).rejects.toThrow(AgentError)
  })

  it('generates session ids of at least 33 characters', () => {
    expect(newSessionId().length).toBeGreaterThanOrEqual(33)
  })
})
