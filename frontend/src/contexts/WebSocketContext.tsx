import { createContext, useContext, useState, type ReactNode } from 'react'
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

interface WebSocketContextValue {
  client: Client | null
  onlineUsers: string[]
  isLoading: boolean
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

  const connect = (token: string) => {
    // Mirror JwtChannelInterceptor expectation: token in connectHeaders (not HTTP headers)
    const stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws',       // native WebSocket — no SockJS
      connectHeaders: {
        Authorization: `Bearer ${token}`,         // STOMP CONNECT frame header
      },
      reconnectDelay: 5000,                       // default — adequate for LAN demo
      onConnect: () => {
        setIsLoading(true)
        // Subscribe inside onConnect — NEVER before activate() returns (RESEARCH Pitfall 2)
        stompClient.subscribe('/topic/presence', (frame: IMessage) => {
          const { onlineUsers: users } = JSON.parse(frame.body) as { onlineUsers: string[] }
          setOnlineUsers(users)
          setIsLoading(false)
        })
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'])
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

  const subscribe = (destination: string, callback: (msg: IMessage) => void) => {
    return client?.subscribe(destination, callback)
  }

  const publish = (destination: string, body: string) => {
    client?.publish({ destination, body })
  }

  return (
    <WebSocketContext.Provider value={{ client, onlineUsers, isLoading, connect, disconnect, subscribe, publish }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider')
  return ctx
}
