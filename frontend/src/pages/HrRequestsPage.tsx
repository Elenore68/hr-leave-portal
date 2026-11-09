import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { startHrRequest, startTimeOffRequest } from '../lib/api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

/** Short, readable id from a Step Functions execution ARN. */
export function executionName(arn: string): string {
  return arn.split(':').pop() ?? arn
}

function Result({ arn, testId }: { arn: string; testId: string }) {
  return (
    <div className="rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-800" data-testid={testId}>
      <p className="font-medium">Request submitted. HR workflow started.</p>
      <p className="mt-1 break-all text-xs">
        Reference: <code>{executionName(arn)}</code>
      </p>
    </div>
  )
}

function ErrorText({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  )
}

function TimeOffForm({ userId }: { userId: string }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arn, setArn] = useState<string | null>(null)
  const invalid = !!start && !!end && end < start

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (invalid) return
    setBusy(true)
    setError(null)
    setArn(null)
    try {
      const res = await startTimeOffRequest({ user_id: userId, start_date: start, end_date: end })
      setArn(res.executionArn)
      setStart('')
      setEnd('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-primary">Request time off</h2>
      <p className="mb-4 text-sm text-secondary">Sends your dates to the HR approval workflow.</p>
      <form onSubmit={submit} className="space-y-4" aria-label="Request time off">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" required value={start} onChange={(e) => setStart(e.target.value)} data-testid="timeoff-start" />
          <Input
            label="End date"
            type="date"
            required
            min={start || undefined}
            value={end}
            error={invalid ? 'End date must be on or after the start date.' : undefined}
            onChange={(e) => setEnd(e.target.value)}
            data-testid="timeoff-end"
          />
        </div>
        <div aria-live="polite" className="space-y-2">
          {error && <ErrorText message={error} />}
          {arn && <Result arn={arn} testId="timeoff-result" />}
        </div>
        <Button type="submit" variant="gold" disabled={busy || !start || !end || invalid} data-testid="timeoff-submit">
          {busy ? 'Submitting…' : 'Submit request'}
        </Button>
      </form>
    </Card>
  )
}

function QuestionForm({ userId }: { userId: string }) {
  const textId = useId()
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arn, setArn] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = prompt.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    setArn(null)
    try {
      const res = await startHrRequest({ user_id: userId, prompt: text })
      setArn(res.executionArn)
      setPrompt('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-primary">Ask HR</h2>
      <p className="mb-4 text-sm text-secondary">Benefits and policy questions are answered by the HR workflow.</p>
      <form onSubmit={submit} className="space-y-4" aria-label="Ask HR">
        <div className="space-y-1.5">
          <label htmlFor={textId} className="block text-sm font-medium text-secondary">
            Your question
          </label>
          <textarea
            id={textId}
            className="field min-h-[7rem]"
            required
            maxLength={4000}
            placeholder="e.g. How many vacation days do I get per year?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            data-testid="hr-prompt"
          />
        </div>
        <div aria-live="polite" className="space-y-2">
          {error && <ErrorText message={error} />}
          {arn && <Result arn={arn} testId="hr-result" />}
        </div>
        <Button type="submit" disabled={busy || !prompt.trim()} data-testid="hr-submit">
          {busy ? 'Sending…' : 'Send question'}
        </Button>
      </form>
    </Card>
  )
}

export function HrRequestsPage() {
  const { email } = useAuth()
  const userId = email ?? ''
  return (
    <section aria-labelledby="hr-heading">
      <div className="mb-6">
        <h1 id="hr-heading" className="text-2xl font-semibold text-primary">
          HR Requests
        </h1>
        <p className="text-sm text-secondary">
          Submitted as <span className="font-medium text-ink">{userId || 'you'}</span>.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeOffForm userId={userId} />
        <QuestionForm userId={userId} />
      </div>
    </section>
  )
}
