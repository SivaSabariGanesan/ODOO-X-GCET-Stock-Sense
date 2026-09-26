import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { getAuthToken } from '@/lib/apiClient'
import { useToast } from '@/context/ToastContext'
import type { EventEnvelope, EventCallback, WebSocketContextType } from '@/types/websocket'

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<EventEnvelope | null>(null)
  
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map())

  // Access toast system safely
  let toastContext: ReturnType<typeof useToast> | null = null
  try {
    toastContext = useToast()
  } catch {
    // ToastContext not available in some isolated test harnesses
  }

  const connect = useCallback(() => {
    const token = getAuthToken()
    if (!token) {
      setIsConnected(false)
      return
    }

    // Determine backend WebSocket URL
    const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string) || ''
    let wsHost = import.meta.env.DEV ? '127.0.0.1:3001' : window.location.host
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    if (rawBaseUrl) {
      try {
        const parsed = new URL(rawBaseUrl, window.location.origin)
        wsHost = parsed.host
        protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      } catch {
        // Fallback
      }
    }

    const wsUrl = `${protocol}//${wsHost}/ws?token=${encodeURIComponent(token)}`

    // Close existing socket if open
    if (socketRef.current) {
      socketRef.current.close()
    }

    try {
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        console.log('[WebSocket] Connected to StockSense real-time event stream')
      }

      ws.onmessage = (evt) => {
        try {
          if (evt.data === 'ping') {
            ws.send('pong')
            return
          }

          const envelope: EventEnvelope = JSON.parse(evt.data)
          setLastEvent(envelope)

          // 1. Trigger automated UI Toast notifications for operational events
          if (toastContext && envelope.payload) {
            const p = envelope.payload
            switch (envelope.eventType) {
              case 'LOW_STOCK_ALERT':
                toastContext.warning(
                  'Low Stock Alert',
                  `Product "${p.productName ?? 'Item'}" is low in stock (${p.currentStock ?? 0} remaining, min ${p.minQuantity ?? 0})`
                )
                break
              case 'INVENTORY_BALANCE_UPDATED':
                toastContext.info(
                  'Stock Balance Updated',
                  `${p.productName ?? p.productSku ?? 'Product'} balance changed by ${p.change > 0 ? '+' : ''}${p.change}`
                )
                break
              case 'STOCK_MOVEMENT_RECORDED':
                toastContext.success(
                  'Stock Movement Logged',
                  `[${p.movementType}] ${p.productName ?? 'Item'} (${p.referenceNumber ?? 'Ref'})`
                )
                break
              case 'RECEIPT_PROCESSED':
                toastContext.success('Receipt Processed', `Receipt #${p.receiptNumber ?? ''} stock received`)
                break
              case 'DELIVERY_PROCESSED':
                toastContext.success('Delivery Processed', `Delivery #${p.deliveryNumber ?? ''} stock dispatched`)
                break
              case 'TRANSFER_EXECUTED':
                toastContext.success('Transfer Processed', `Internal Transfer #${p.transferNumber ?? ''} completed`)
                break
              case 'ADJUSTMENT_APPLIED':
                toastContext.info('Adjustment Processed', `Inventory Adjustment #${p.adjustmentNumber ?? ''} applied`)
                break
            }
          }

          // 2. Dispatch event payload to registered subscriber callbacks
          const handlers = listenersRef.current.get(envelope.eventType)
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(envelope.payload, envelope)
              } catch (err) {
                console.error(`[WebSocket] Callback error for event '${envelope.eventType}':`, err)
              }
            })
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message frame:', err)
        }
      }

      ws.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err)
      }

      ws.onclose = () => {
        setIsConnected(false)
        socketRef.current = null

        // Exponential backoff reconnect retry
        const attempts = reconnectAttemptsRef.current
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000)
        reconnectAttemptsRef.current = attempts + 1

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    } catch (err) {
      console.error('[WebSocket] Socket creation failed:', err)
      setIsConnected(false)
    }
  }, [toastContext])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [connect])

  const subscribeChannel = useCallback((channel: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'subscribe',
          channel: channel.trim().toLowerCase(),
        })
      )
    }
  }, [])

  const unsubscribeChannel = useCallback((channel: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'unsubscribe',
          channel: channel.trim().toLowerCase(),
        })
      )
    }
  }, [])

  const onEvent = useCallback(<T = any,>(eventType: string, handler: EventCallback<T>) => {
    let set = listenersRef.current.get(eventType)
    if (!set) {
      set = new Set()
      listenersRef.current.set(eventType, set)
    }
    set.add(handler as EventCallback)

    return () => {
      const currentSet = listenersRef.current.get(eventType)
      if (currentSet) {
        currentSet.delete(handler as EventCallback)
        if (currentSet.size === 0) {
          listenersRef.current.delete(eventType)
        }
      }
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastEvent,
        subscribeChannel,
        unsubscribeChannel,
        onEvent,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}
