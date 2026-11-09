import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createLeave, listEmployees, listLeave } from '../lib/api'
import type { Employee, Leave, LeaveInput } from '../lib/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Spinner } from '../components/Spinner'

const EMPTY: LeaveInput = { startDate: '', endDate: '', note: '' }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

/** Whole days between two YYYY-MM-DD dates, counting both ends. */
export function leaveDays(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) + 1 : 0
}

export function LeavePage() {
  const selectId = useId()
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [leave, setLeave] = useState<Leave[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LeaveInput>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listEmployees()
      .then((list) => {
        setEmployees(list)
        if (list.length > 0) setEmployeeId(list[0].employeeId)
      })
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [])

  const loadLeave = useCallback(async (id: string) => {
    if (!id) return
    setLeave(null)
    setError(null)
    try {
      const items = await listLeave(id)
      setLeave([...items].sort((a, b) => b.startDate.localeCompare(a.startDate)))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void loadLeave(employeeId)
  }, [employeeId, loadLeave])

  const datesInvalid = !!form.startDate && !!form.endDate && form.endDate < form.startDate

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (datesInvalid) return
    setBusy(true)
    setFormError(null)
    setSaved(false)
    try {
      await createLeave(employeeId, { ...form, note: form.note?.trim() ?? '' })
      setForm(EMPTY)
      setSaved(true)
      await loadLeave(employeeId)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const selected = employees?.find((x) => x.employeeId === employeeId)

  return (
    <section aria-labelledby="leave-heading">
      <div className="mb-6">
        <h1 id="leave-heading" className="text-2xl font-semibold text-primary">
          Leave
        </h1>
        <p className="text-sm text-secondary">View and record leave for each employee.</p>
      </div>

      {!employees && !error && (
        <Card className="p-8">
          <Spinner label="Loading employees" />
        </Card>
      )}

      {employees && employees.length === 0 && (
        <Card className="p-10 text-center" data-testid="no-employees">
          <p className="text-lg font-medium text-primary">No employees yet</p>
          <p className="mt-1 text-sm text-secondary">Add an employee first, then record their leave.</p>
        </Card>
      )}

      {employees && employees.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label htmlFor={selectId} className="block text-sm font-medium text-secondary">
                Employee
              </label>
              <select
                id={selectId}
                className="field"
                value={employeeId}
                onChange={(e) => {
                  setSaved(false)
                  setEmployeeId(e.target.value)
                }}
                data-testid="leave-employee"
              >
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={submit} className="space-y-4" aria-label="Record leave">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Start date"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  data-testid="leave-start"
                />
                <Input
                  label="End date"
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  error={datesInvalid ? 'End date must be on or after the start date.' : undefined}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  data-testid="leave-end"
                />
              </div>
              <Input
                label="Note (optional)"
                value={form.note ?? ''}
                maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                data-testid="leave-note"
              />
              <div aria-live="polite">
                {formError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </p>
                )}
                {saved && (
                  <p className="rounded-xl bg-green-100 px-3 py-2 text-sm text-green-800" data-testid="leave-saved">
                    Leave recorded.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="gold"
                disabled={busy || !form.startDate || !form.endDate || datesInvalid}
                data-testid="leave-submit"
              >
                {busy ? 'Saving…' : 'Record leave'}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-ink">
              Leave history{selected ? ` · ${selected.name}` : ''}
            </h2>
            {error && (
              <div role="alert" className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="leave-error">
                <span>{error}</span>
                <Button variant="secondary" onClick={() => void loadLeave(employeeId)}>
                  Retry
                </Button>
              </div>
            )}
            {!leave && !error && <Spinner label="Loading leave" />}
            {leave && leave.length === 0 && (
              <p className="text-sm text-secondary" data-testid="leave-empty">
                No leave recorded yet.
              </p>
            )}
            {leave && leave.length > 0 && (
              <ul className="space-y-3" data-testid="leave-list">
                {leave.map((l) => (
                  <li
                    key={`${l.startDate}-${l.endDate}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {l.startDate} → {l.endDate}
                      </p>
                      {l.note && <p className="text-sm text-secondary">{l.note}</p>}
                    </div>
                    <Badge tone="gold">
                      {leaveDays(l.startDate, l.endDate)} day{leaveDays(l.startDate, l.endDate) === 1 ? '' : 's'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {error && !employees && (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="employees-error">
          {error}
        </div>
      )}
    </section>
  )
}
