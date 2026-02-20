import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders The Memory Trail heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /memory trail/i })).toBeInTheDocument()
  })
})
