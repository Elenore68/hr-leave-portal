import { getAccessToken } from './auth'
import { getConfig } from './config'

export class AgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentError'
  }
}

/** AgentCore requires a runtime session id of at least 33 characters. */
export function newSessionId(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  return `session-${uuid}`.padEnd(33, '0')
}

export function buildAgentUrl(): string {
  const { agentEndpoint, agentRuntimeArn, region } = getConfig()
  if (agentEndpoint) return agentEndpoint
  return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodeURIComponent(
    agentRuntimeArn,
  )}/invocations?qualifier=DEFAULT`
}

/** Extracts the text from one SSE `data:` payload (JSON strings are decoded). */
function decodeSsePayload(payload: string): string {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (typeof parsed === 'string') return parsed
  } catch {
    /* not JSON: use the raw payload */
  }
  return payload
}

export interface InvokeOptions {
  prompt: string
  actorId: string
  sessionId: string
  signal?: AbortSignal
}

/** Invokes the hrAgent and yields the reply text incrementally. */
export async function* invokeAgent(opts: InvokeOptions): AsyncGenerator<string, void, void> {
  const token = await getAccessToken()
  if (!token) throw new AgentError('Your session has expired. Please sign in again.')

  let res: Response
  try {
    res = await fetch(buildAgentUrl(), {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'Content-Type': 'application/json',
        // AgentCore's Cognito JWT authorizer validates the access token.
        Authorization: `Bearer ${token}`,
        'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': opts.sessionId,
      },
      body: JSON.stringify({ prompt: opts.prompt, actorId: opts.actorId }),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new AgentError(
      'Could not reach the assistant. This may be a network problem or the agent endpoint may not allow browser (CORS) requests.',
    )
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new AgentError('The assistant rejected your credentials. Please sign in again.')
    }
    throw new AgentError(`The assistant returned an error (HTTP ${res.status}).`)
  }
  if (!res.body) {
    throw new AgentError('The assistant returned an empty response.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sse: boolean | null = null
  let buffer = ''

  const drain = function* (final: boolean): Generator<string> {
    const lines = buffer.split('\n')
    buffer = final ? '' : (lines.pop() ?? '')
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const raw = line.slice(5)
        yield decodeSsePayload(raw.startsWith(' ') ? raw.slice(1) : raw)
      }
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (sse === null) sse = text.trimStart().startsWith('data:')
      if (!sse) {
        if (text) yield text
        continue
      }
      buffer += text
      yield* drain(false)
    }
    const tail = decoder.decode()
    if (sse) {
      buffer += tail
      yield* drain(true)
    } else if (tail) {
      yield tail
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new AgentError('The assistant response was interrupted. Please try again.')
  }
}
