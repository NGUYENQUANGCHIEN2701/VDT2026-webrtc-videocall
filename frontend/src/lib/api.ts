import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
})

// Mirrors JwtAuthenticationFilter — inject Authorization header on every outbound request
// Reads from localStorage (NOT from AuthContext state) to avoid closure staleness
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vdt_token')   // key 'vdt_token' — CONTEXT.md D-05
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
