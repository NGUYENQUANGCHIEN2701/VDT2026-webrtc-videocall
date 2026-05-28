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
// StrictMode intentionally removed: it double-invokes effect cleanups in development,
// which fires hangUp() while a call is still active and immediately terminates it.
// RTCPeerConnection, MediaStream, and AudioContext are all non-idempotent by nature.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <WebSocketProvider>
        <CallProvider>
          <App />
        </CallProvider>
      </WebSocketProvider>
    </AuthProvider>
  </BrowserRouter>,
)
