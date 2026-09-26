export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  timestamp: string;
  channel?: string;
  payload: T;
}

export interface InventoryBalanceUpdatedPayload {
  productId: string;
  productSku?: string;
  productName?: string;
  locationId: string;
  locationName?: string;
  previousQuantity: number;
  newQuantity: number;
  change: number;
}

export interface StockMovementRecordedPayload {
  movementId: string;
  productName: string;
  movementType: string;
  quantityChange: number;
  referenceNumber: string;
}

export interface LowStockAlertPayload {
  productId: string;
  productName: string;
  currentStock: number;
  minQuantity: number;
  locationName?: string;
}

export type EventCallback<T = any> = (payload: T, envelope: EventEnvelope<T>) => void;

export interface WebSocketContextType {
  isConnected: boolean;
  lastEvent: EventEnvelope | null;
  subscribeChannel: (channel: string) => void;
  unsubscribeChannel: (channel: string) => void;
  onEvent: <T = any>(eventType: string, handler: EventCallback<T>) => () => void;
}
