import { getIdToken } from './auth'
import { getConfig } from './config'
import type {
  Employee,
  EmployeeInput,
  HrRequestInput,
  HrRequestStarted,
  Leave,
  LeaveInput,
  TimeOffRequestInput,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Registers a callback fired on HTTP 401 (the app signs the user out and redirects). */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn
}

function mapStatus(status: number, body: unknown): string {
  const detail =
    body && typeof body === 'object' && 'detail' in body
      ? (body as { detail: unknown }).detail
      : undefined
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 404:
      return typeof detail === 'string' ? detail : 'Not found.'
    case 422:
      return 'Some fields are invalid. Check the form and try again.'
    default:
      return typeof detail === 'string' ? detail : `Request failed (HTTP ${status}).`
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken()
  if (!token) {
    unauthorizedHandler?.()
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }
  const base = getConfig().apiUrl.replace(/\/+$/, '')
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        // Cognito user pool authorizer expects the raw ID token (no "Bearer").
        Authorization: token,
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0)
  }
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    if (res.status === 401) unauthorizedHandler?.()
    throw new ApiError(mapStatus(res.status, body), res.status)
  }
  return (await res.json()) as T
}

export async function listEmployees(): Promise<Employee[]> {
  const data = await request<{ employees: Employee[] }>('/employees')
  return data.employees
}

export function getEmployee(id: string): Promise<Employee> {
  return request<Employee>(`/employees/${encodeURIComponent(id)}`)
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) })
}

export function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  return request<Employee>(`/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteEmployee(id: string): Promise<void> {
  await request<{ message: string }>(`/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listLeave(employeeId: string): Promise<Leave[]> {
  const data = await request<{ leave: Leave[] }>(
    `/employees/${encodeURIComponent(employeeId)}/leave`,
  )
  return data.leave
}

export function createLeave(employeeId: string, input: LeaveInput): Promise<Leave> {
  return request<Leave>(`/employees/${encodeURIComponent(employeeId)}/leave`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function startTimeOffRequest(input: TimeOffRequestInput): Promise<HrRequestStarted> {
  return request<HrRequestStarted>('/hr-requests/time-off', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function startHrRequest(input: HrRequestInput): Promise<HrRequestStarted> {
  return request<HrRequestStarted>('/hr-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
