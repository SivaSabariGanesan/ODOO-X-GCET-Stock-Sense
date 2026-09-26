import { useEffect } from 'react'
import { useWebSocketContext } from '@/context/WebSocketContext'
import type { EventCallback, EventEnvelope } from '@/types/websocket'

export function useWebSocket<T = any>(
  eventType?: string,
  handler?: EventCallback<T>
): {
  isConnected: boolean
  lastEvent: EventEnvelope | null
  subscribeChannel: (channel: string) => void
  unsubscribeChannel: (channel: string) => void
} {
  const { isConnected, lastEvent, subscribeChannel, unsubscribeChannel, onEvent } = useWebSocketContext()

  useEffect(() => {
    if (!eventType || !handler) return

    const unsubscribe = onEvent<T>(eventType, handler)
    return () => {
      unsubscribe()
    }
  }, [eventType, handler, onEvent])

  return {
    isConnected,
    lastEvent,
    subscribeChannel,
    unsubscribeChannel,
  }
}
