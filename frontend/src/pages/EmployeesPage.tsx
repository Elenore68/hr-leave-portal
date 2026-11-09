import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '../lib/api'
import type { Employee, EmployeeInput } from '../lib/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { Spinner } from '../components/Spinner'

const EMPTY: EmployeeInput = { name: '', department: '', startDate: '', role: 'employee' }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

function EmployeeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: EmployeeInput
  onSave: (v: EmployeeInput) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<EmployeeInput>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof EmployeeInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({ ...values, name: values.name.trim(), department: values.department.trim() })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Name" required value={values.name} onChange={set('name')} data-testid="form-name" />
      <Input
        label="Department"
        required
        value={values.department}
        onChange={set('department')}
        data-testid="form-department"
      />
      <Input
        label="Start date"
        type="date"
        required
        value={values.startDate}
        onChange={set('startDate')}
        data-testid="form-start-date"
      />
      <Input label="Role" value={values.role ?? ''} onChange={set('role')} data-testid="form-role" />
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} data-testid="form-cancel">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={busy || !values.name.trim() || !values.department.trim() || !values.startDate}
          data-testid="form-save"
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setEmployees(null)
    try {
      setEmployees(await listEmployees())
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!employees) return []
    if (!q) return employees
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q),
    )
  }, [employees, query])

  const save = async (values: EmployeeInput) => {
    if (editing && editing !== 'new') await updateEmployee(editing.employeeId, values)
    else await createEmployee(values)
    setEditing(null)
    await load()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteError(null)
    try {
      await deleteEmployee(deleting.employeeId)
      setDeleting(null)
      await load()
    } catch (err) {
      setDeleteError(errorMessage(err))
    }
  }

  return (
    <section aria-labelledby="employees-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="employees-heading" className="text-2xl font-semibold text-primary">
            Employees
          </h1>
          <p className="text-sm text-secondary">Add, edit and remove people in your organisation.</p>
        </div>
        <Button variant="gold" onClick={() => setEditing('new')} data-testid="add-employee">
          + Add employee
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          label="Search"
          type="search"
          placeholder="Name or department"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="search"
        />
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="list-error">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void load()} data-testid="retry">
            Retry
          </Button>
        </div>
      )}

      {!employees && !error && (
        <Card className="p-8">
          <Spinner label="Loading employees" />
        </Card>
      )}

      {employees && filtered.length === 0 && (
        <Card className="p-10 text-center" data-testid="empty-state">
          <p className="text-lg font-medium text-primary">
            {employees.length === 0 ? 'No employees yet' : 'No matches'}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {employees.length === 0
              ? 'Add your first employee to get started.'
              : 'Try a different search term.'}
          </p>
        </Card>
      )}

      {filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="employee-list">
          {filtered.map((emp) => (
            <li key={emp.employeeId}>
              <Card className="h-full p-5 transition hover:-translate-y-1 hover:shadow-glow">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-ink"
                    aria-hidden="true"
                  >
                    {emp.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-ink">{emp.name}</h2>
                    <p className="text-sm text-secondary">{emp.department}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge>{emp.role}</Badge>
                  <Badge tone="pink">Since {emp.startDate}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(emp)} aria-label={`Edit ${emp.name}`} data-testid={`edit-${emp.employeeId}`}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleting(emp)
                    }}
                    aria-label={`Delete ${emp.name}`}
                    data-testid={`delete-${emp.employeeId}`}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add employee' : 'Edit employee'} onClose={() => setEditing(null)}>
          <EmployeeForm
            initial={editing === 'new' ? EMPTY : { ...editing }}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete employee?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-secondary">
            This permanently removes <strong>{deleting.name}</strong>. This cannot be undone.
          </p>
          <div aria-live="assertive">
            {deleteError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} data-testid="delete-cancel">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} data-testid="delete-confirm">
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
