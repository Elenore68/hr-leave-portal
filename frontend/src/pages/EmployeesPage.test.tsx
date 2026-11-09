import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  listEmployees: vi.fn(),
  deleteEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
}))

import * as api from '../lib/api'
import { EmployeesPage } from './EmployeesPage'

const ada = { employeeId: 'e1', name: 'Ada Lovelace', department: 'Engineering', startDate: '2024-01-01', role: 'employee' }

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.mocked(api.listEmployees).mockReset().mockResolvedValue([ada])
    vi.mocked(api.deleteEmployee).mockReset().mockResolvedValue(undefined)
  })

  it('renders the list from the API', async () => {
    render(<EmployeesPage />)
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('deletes only after confirmation', async () => {
    const user = userEvent.setup()
    render(<EmployeesPage />)
    await user.click(await screen.findByTestId('delete-e1'))
    expect(api.deleteEmployee).not.toHaveBeenCalled()
    await user.click(screen.getByTestId('delete-confirm'))
    await waitFor(() => expect(api.deleteEmployee).toHaveBeenCalledWith('e1'))
  })

  it('shows an error state with retry', async () => {
    vi.mocked(api.listEmployees).mockRejectedValueOnce(new Error('Network error.'))
    render(<EmployeesPage />)
    expect(await screen.findByTestId('list-error')).toHaveTextContent('Network error.')
  })
})
