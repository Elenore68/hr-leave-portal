import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  startTimeOffRequest: vi.fn(),
  startHrRequest: vi.fn(),
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ email: 'shahad@example.com', loading: false, signIn: vi.fn(), signOut: vi.fn() }),
}))

import * as api from '../lib/api'
import { HrRequestsPage, executionName } from './HrRequestsPage'

const ARN = 'arn:aws:states:us-east-1:111111111111:execution:HrStateMachine:abc-123'

describe('HrRequestsPage', () => {
  beforeEach(() => {
    vi.mocked(api.startTimeOffRequest).mockReset().mockResolvedValue({ executionArn: ARN })
    vi.mocked(api.startHrRequest).mockReset().mockResolvedValue({ executionArn: ARN })
  })

  it('extracts a short reference from the execution ARN', () => {
    expect(executionName(ARN)).toBe('abc-123')
  })

  it('submits a time-off request as the signed-in user', async () => {
    const user = userEvent.setup()
    render(<HrRequestsPage />)
    await user.type(screen.getByTestId('timeoff-start'), '2026-06-01')
    await user.type(screen.getByTestId('timeoff-end'), '2026-06-03')
    await user.click(screen.getByTestId('timeoff-submit'))
    await waitFor(() =>
      expect(api.startTimeOffRequest).toHaveBeenCalledWith({
        user_id: 'shahad@example.com',
        start_date: '2026-06-01',
        end_date: '2026-06-03',
      }),
    )
    expect(await screen.findByTestId('timeoff-result')).toHaveTextContent('abc-123')
  })

  it('sends an HR question and shows an API error', async () => {
    vi.mocked(api.startHrRequest).mockRejectedValueOnce(new Error('Request failed (HTTP 502).'))
    const user = userEvent.setup()
    render(<HrRequestsPage />)
    await user.type(screen.getByTestId('hr-prompt'), '  How many vacation days?  ')
    await user.click(screen.getByTestId('hr-submit'))
    await waitFor(() =>
      expect(api.startHrRequest).toHaveBeenCalledWith({ user_id: 'shahad@example.com', prompt: 'How many vacation days?' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 502')
  })
})
