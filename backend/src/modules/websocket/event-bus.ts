import { ConnectionManager } from "./connection-manager";
import { EventEnvelope, EventType } from "./types";

export interface PublishOptions {
  channel?: string;
  role?: string;
  userId?: string;
}

export class EventBus {
  /**
   * Central Event Bus Method: Publishes an inventory/system event to WebSocket clients.
   * MUST only be called AFTER database transactions have successfully committed!
   */
  static publish<T = any>(
    type: EventType,
    data: T,
    options?: PublishOptions
  ): EventEnvelope<T> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    const envelope: EventEnvelope<T> = {
      type,
      eventId,
      timestamp,
      data,
    };

    try {
      if (options?.channel) {
        ConnectionManager.sendToChannel(options.channel, envelope);
      } else if (options?.role) {
        ConnectionManager.sendToRole(options.role, envelope);
      } else if (options?.userId) {
        ConnectionManager.sendToUser(options.userId, envelope);
      } else {
        ConnectionManager.broadcast(envelope);
      }
    } catch (err) {
      console.error(`[EventBus] Error publishing event '${type}' (${eventId}):`, err);
    }

    return envelope;
  }
}
