import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/agent', () => ({
  invokeAgent: vi.fn(),
  newSessionId: () => 'session-0000000000000000000000000000000',
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ email: 'a@b.com', loading: false, signIn: vi.fn(), signOut: vi.fn() }),
}))

import * as agent from '../lib/agent'
import { AssistantPage } from './AssistantPage'

async function* reply(...chunks: string[]) {
  for (const c of chunks) yield c
}

describe('AssistantPage', () => {
  beforeEach(() => {
    vi.mocked(agent.invokeAgent).mockReset()
  })

  it('shows the streamed reply', async () => {
    vi.mocked(agent.invokeAgent).mockImplementation(() => reply('Hello', ' HR'))
    const user = userEvent.setup()
    render(<AssistantPage />)
    await user.type(screen.getByTestId('chat-input'), 'hi')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByText('Hello HR')).toBeInTheDocument()
    expect(agent.invokeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'hi', actorId: 'a@b.com' }),
    )
  })

  it('shows an error banner when the agent fails', async () => {
    // eslint-disable-next-line require-yield
    vi.mocked(agent.invokeAgent).mockImplementation(async function* () {
      throw new Error('Could not reach the assistant.')
    })
    const user = userEvent.setup()
    render(<AssistantPage />)
    await user.click(screen.getAllByTestId('suggestion')[0])
    expect(await screen.findByTestId('chat-error')).toHaveTextContent('Could not reach')
  })
})
