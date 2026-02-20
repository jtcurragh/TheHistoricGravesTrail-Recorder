import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { UserSetupScreen } from './UserSetupScreen'

describe('UserSetupScreen', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await db.delete()
    await db.open()
  })

  it('renders welcome heading and explanation', () => {
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /welcome to the memory trail/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/the memory trail helps your community record/i)
    ).toBeInTheDocument()
  })

  it('shows Your Name and Your Group Name inputs', () => {
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your group name/i)).toBeInTheDocument()
  })

  it('disables Create My Trails button when fields are empty', () => {
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    const button = screen.getByRole('button', { name: /create my trails/i })
    expect(button).toBeDisabled()
  })

  it('disables Create My Trails when only one field is filled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByLabelText(/your name/i), 'Sheila')
    const button = screen.getByRole('button', { name: /create my trails/i })
    expect(button).toBeDisabled()
  })

  it('enables Create My Trails when both fields are filled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByLabelText(/your name/i), 'Sheila')
    await user.type(screen.getByLabelText(/your group name/i), 'Clonfert Trails')
    const button = screen.getByRole('button', { name: /create my trails/i })
    expect(button).toBeEnabled()
  })

  it('shows live preview of trail names when group name entered', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByLabelText(/your group name/i), 'Clonfert Trails')
    expect(
      screen.getByText(/clonfert trails graveyard trail and clonfert trails parish trail/i)
    ).toBeInTheDocument()
  })

  it('shows group code preview when group name entered', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByLabelText(/your group name/i), 'Clonfert Trails')
    expect(screen.getByText(/your site code will be: clonfert/i)).toBeInTheDocument()
  })

  it('calls onCreateComplete on submit', async () => {
    const user = userEvent.setup()
    const onCreateComplete = vi.fn()

    render(
      <MemoryRouter>
        <UserSetupScreen onCreateComplete={onCreateComplete} />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/your name/i), 'Sheila')
    await user.type(screen.getByLabelText(/your group name/i), 'Clonfert Trails')
    await user.click(screen.getByRole('button', { name: /create my trails/i }))

    await waitFor(() => {
      expect(onCreateComplete).toHaveBeenCalled()
    })
  })
})
