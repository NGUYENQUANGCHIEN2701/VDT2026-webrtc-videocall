import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

interface WebSocketContextValue {
  client: Client | null
  onlineUsers: string[]
  isLoading: boolean
  isConnected: boolean
  connect: (token: string) => void
  disconnect: () => Promise<void>
  subscribe: (destination: string, callback: (msg: IMessage) => void) => StompSubscription | undefined
  publish: (destination: string, body: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const connect = (token: string) => {
    // Mirror JwtChannelInterceptor expectation: token in connectHeaders (not HTTP headers)
    const stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws',       // native WebSocket — no SockJS
      connectHeaders: {
        Authorization: `Bearer ${token}`,         // STOMP CONNECT frame header
      },
      reconnectDelay: 5000,                       // default — adequate for LAN demo
      onConnect: () => {
        setIsConnected(true)
        setIsLoading(true)
        // Subscribe inside onConnect — NEVER before activate() returns (RESEARCH Pitfall 2)
        // Also fires on every reconnect, which is correct — subs are dropped on disconnect.
        stompClient.subscribe('/topic/presence', (frame: IMessage) => {
          const { onlineUsers: users } = JSON.parse(frame.body) as { onlineUsers: string[] }
          setOnlineUsers(users)
          setIsLoading(false)
        })
        // Race condition fix: the backend broadcasts presence on SessionConnectedEvent,
        // which fires before this SUBSCRIBE frame reaches the server. Request a fresh
        // broadcast now that we are subscribed and guaranteed to receive it.
        stompClient.publish({ destination: '/app/presence/sync', body: '' })
      },
      onDisconnect: () => {
        setIsConnected(false)
        setIsLoading(false)
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'])
        setIsConnected(false)
        setIsLoading(false)
      },
      onWebSocketClose: () => {
        setIsConnected(false)
        setIsLoading(false)
      },
    })
    stompClient.activate()
    setClient(stompClient)
  }

  const disconnect = async () => {
    if (client) {
      await client.deactivate()
      setClient(null)
      setOnlineUsers([])
    }
  }

  const subscribe = useCallback((destination: string, callback: (msg: IMessage) => void) => {
    return client?.subscribe(destination, callback)
  }, [client])

  const publish = useCallback((destination: string, body: string) => {
    client?.publish({ destination, body })
  }, [client])

  return (
    <WebSocketContext.Provider value={{ client, onlineUsers, isLoading, isConnected, connect, disconnect, subscribe, publish }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider')
  return ctx
}
