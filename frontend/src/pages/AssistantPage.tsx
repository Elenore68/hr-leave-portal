import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { invokeAgent, newSessionId } from '../lib/agent'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'List all employees',
  'Who joined this year?',
  'Draft a leave request email for next Friday',
  'Show recorded leave',
]

export function AssistantPage() {
  const { email } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState(newSessionId)
  const nextId = useRef(1)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || busy) return
      setError(null)
      setInput('')
      setBusy(true)
      const userId = nextId.current++
      const botId = nextId.current++
      setMessages((m) => [
        ...m,
        { id: userId, role: 'user', text },
        { id: botId, role: 'assistant', text: '' },
      ])
      const controller = new AbortController()
      abortRef.current = controller
      try {
        for await (const chunk of invokeAgent({
          prompt: text,
          actorId: email ?? 'default',
          sessionId,
          signal: controller.signal,
        })) {
          setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: x.text + chunk } : x)))
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'The assistant could not respond.')
          setMessages((m) => m.filter((x) => !(x.id === botId && x.text === '')))
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, email, sessionId],
  )

  const newChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setBusy(false)
    setSessionId(newSessionId())
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const lastIsEmptyBot =
    busy && messages.length > 0 && messages[messages.length - 1].text === ''

  return (
    <section aria-labelledby="assistant-heading" className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 id="assistant-heading" className="text-2xl font-semibold text-primary">
            HR Assistant
          </h1>
          <p className="text-sm text-secondary">Ask about employees, leave and HR emails.</p>
        </div>
        <Button variant="secondary" onClick={newChat} data-testid="new-chat">
          New chat
        </Button>
      </div>

      <Card className="flex h-[60vh] flex-col overflow-hidden">
        <div
          className="flex-1 space-y-3 overflow-y-auto p-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          data-testid="chat-log"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gold text-2xl" aria-hidden="true">
                ✨
              </span>
              <p className="text-secondary">How can I help today?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-lavender-deep bg-white px-4 py-2 text-sm text-primary transition hover:-translate-y-0.5 hover:bg-lavender"
                    data-testid="suggestion"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'assistant' && m.text === '' ? null : (
              <div
                key={m.id}
                className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md bg-lavender text-ink'
                  }`}
                  data-testid={`msg-${m.role}`}
                >
                  <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                  {m.text}
                </div>
              </div>
            ),
          )}

          {lastIsEmptyBot && (
            <div className="flex justify-start" data-testid="typing" role="status" aria-label="Assistant is typing">
              <div className="flex gap-1 rounded-3xl rounded-bl-md bg-lavender px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-blink rounded-full bg-primary"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div aria-live="assertive">
          {error && (
            <p role="alert" className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="chat-error">
              {error}
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/60 bg-white/60 p-3">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            className="field rounded-full"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            data-testid="chat-input"
          />
          <Button type="submit" disabled={busy || !input.trim()} data-testid="chat-send">
            Send
          </Button>
        </form>
      </Card>
    </section>
  )
}
