import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { MOCK_TOKEN } from './mocks/handlers'

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initial state has token=null when localStorage is empty', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.token).toBeNull()
    expect(result.current.username).toBeNull()
  })

  it('initial state restores token and username from localStorage', () => {
    localStorage.setItem('vdt_token', MOCK_TOKEN)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.token).toBe(MOCK_TOKEN)
    expect(result.current.username).toBe('testuser')
  })

  it('LOGIN dispatch sets token and persists to localStorage', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.dispatch({ type: 'LOGIN', token: MOCK_TOKEN, username: 'testuser' })
    })

    expect(result.current.token).toBe(MOCK_TOKEN)
    expect(result.current.username).toBe('testuser')
    expect(localStorage.getItem('vdt_token')).toBe(MOCK_TOKEN)
  })

  it('LOGOUT dispatch clears token and removes from localStorage', () => {
    localStorage.setItem('vdt_token', MOCK_TOKEN)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.dispatch({ type: 'LOGOUT' })
    })

    expect(result.current.token).toBeNull()
    expect(result.current.username).toBeNull()
    expect(localStorage.getItem('vdt_token')).toBeNull()
  })
})
