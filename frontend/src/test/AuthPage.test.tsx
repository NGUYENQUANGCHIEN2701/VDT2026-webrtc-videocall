import { describe, it, expect } from 'vitest'

describe('AuthPage', () => {
  it('placeholder — AuthPage component exists', () => {
    // TODO: UI-01 — replaced in Plan 02 with real tests
    expect(true).toBe(true)
  })

  it.todo('UI-01: login success navigates to /users')
  it.todo('UI-01: 401 shows error alert')
  it.todo('UI-01: 409 shows username taken')
  it.todo('UI-01: submit button shows spinner while loading')
})
