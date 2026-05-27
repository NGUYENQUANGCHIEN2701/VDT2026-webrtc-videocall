import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { CallProvider } from '@/contexts/CallContext'
import App from './App'
import './index.css'

// Provider order is locked by D-04:
// BrowserRouter outermost — so CallProvider can call useNavigate() internally
// AuthProvider before WebSocketProvider — auth token needed to connect STOMP
// CallProvider innermost — depends on useWebSocket() and useAuth()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
