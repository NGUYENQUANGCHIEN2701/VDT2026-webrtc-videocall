import { http, HttpResponse } from 'msw'

// Valid-looking JWT: header.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.sig
// Payload decodes to: { "sub": "testuser", "iat": 1600000000, "exp": 9999999999 }
export const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.mock_signature'

// Base URL used by Axios instance (src/lib/api.ts baseURL: 'http://localhost:8080')
// MSW v2 node interceptor requires absolute URLs to match Axios requests
const API_BASE = 'http://localhost:8080'

export const handlers = [
  http.post(`${API_BASE}/api/auth/login`, () => {
    return HttpResponse.json({ token: MOCK_TOKEN })
  }),

  http.post(`${API_BASE}/api/auth/register`, () => {
    return HttpResponse.json({ token: MOCK_TOKEN }, { status: 201 })
  }),

  http.post(`${API_BASE}/api/auth/logout`, () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
