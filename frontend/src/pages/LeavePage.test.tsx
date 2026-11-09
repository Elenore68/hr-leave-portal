import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  listEmployees: vi.fn(),
  listLeave: vi.fn(),
  createLeave: vi.fn(),
}))

import * as api from '../lib/api'
import { LeavePage, leaveDays } from './LeavePage'

const ada = { employeeId: 'e1', name: 'Ada Lovelace', department: 'Engineering', startDate: '2024-01-01', role: 'employee' }

describe('LeavePage', () => {
  beforeEach(() => {
    vi.mocked(api.listEmployees).mockReset().mockResolvedValue([ada])
    vi.mocked(api.listLeave)
      .mockReset()
      .mockResolvedValue([{ employeeId: 'e1', startDate: '2026-03-02', endDate: '2026-03-04', note: 'Trip' }])
    vi.mocked(api.createLeave).mockReset().mockResolvedValue({ employeeId: 'e1', startDate: '2026-05-01', endDate: '2026-05-01', note: '' })
  })

  it('counts both ends of a leave period', () => {
    expect(leaveDays('2026-03-02', '2026-03-04')).toBe(3)
    expect(leaveDays('2026-03-02', '2026-03-02')).toBe(1)
  })

  it('shows the selected employee leave history', async () => {
    render(<LeavePage />)
    expect(await screen.findByText('2026-03-02 → 2026-03-04')).toBeInTheDocument()
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(api.listLeave).toHaveBeenCalledWith('e1')
  })

  it('records leave for the selected employee', async () => {
    const user = userEvent.setup()
    render(<LeavePage />)
    await screen.findByTestId('leave-list')
    await user.type(screen.getByTestId('leave-start'), '2026-05-01')
    await user.type(screen.getByTestId('leave-end'), '2026-05-01')
    await user.click(screen.getByTestId('leave-submit'))
    await waitFor(() =>
      expect(api.createLeave).toHaveBeenCalledWith('e1', { startDate: '2026-05-01', endDate: '2026-05-01', note: '' }),
    )
    expect(await screen.findByTestId('leave-saved')).toBeInTheDocument()
  })

  it('blocks an end date before the start date', async () => {
    const user = userEvent.setup()
    render(<LeavePage />)
    await screen.findByTestId('leave-list')
    await user.type(screen.getByTestId('leave-start'), '2026-05-10')
    await user.type(screen.getByTestId('leave-end'), '2026-05-01')
    expect(screen.getByTestId('leave-submit')).toBeDisabled()
    expect(screen.getByText('End date must be on or after the start date.')).toBeInTheDocument()
  })
})
