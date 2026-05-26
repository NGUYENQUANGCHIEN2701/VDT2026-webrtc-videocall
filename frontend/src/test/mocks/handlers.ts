import { http, HttpResponse } from 'msw'

// Valid-looking JWT: header.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.sig
// Payload decodes to: { "sub": "testuser", "iat": 1600000000, "exp": 9999999999 }
export const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.mock_signature'

export const handlers = [
  http.post('/api/auth/login', () => {
    return HttpResponse.json({ token: MOCK_TOKEN })
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({ token: MOCK_TOKEN }, { status: 201 })
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
