import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./auth', () => ({ getIdToken: vi.fn().mockResolvedValue('ID.TOKEN') }))

import { ApiError, deleteEmployee, listEmployees, setUnauthorizedHandler } from './api'
import { setConfigForTests } from './config'

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('api client', () => {
  beforeEach(() => {
    setConfigForTests({
      apiUrl: 'https://api.example.com/prod/',
      userPoolId: 'p',
      userPoolClientId: 'c',
      region: 'us-east-1',
      agentRuntimeArn: 'a',
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(null)
  })

  it('lists employees, unwrapping the array and sending the ID token', async () => {
    const emp = { employeeId: '1', name: 'Ada', department: 'Eng', startDate: '2024-01-01', role: 'employee' }
    const fetchMock = stubFetch(200, { employees: [emp] })
    const result = await listEmployees()
    expect(result).toEqual([emp])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/prod/employees')
    expect((init.headers as Record<string, string>).Authorization).toBe('ID.TOKEN')
  })

  it('maps 404 to a readable message', async () => {
    stubFetch(404, { detail: 'Employee not found' })
    await expect(deleteEmployee('x')).rejects.toMatchObject({
      message: 'Employee not found',
      status: 404,
    })
  })

  it('invokes the unauthorized handler on 401', async () => {
    stubFetch(401, { message: 'Unauthorized' })
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    await expect(listEmployees()).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
