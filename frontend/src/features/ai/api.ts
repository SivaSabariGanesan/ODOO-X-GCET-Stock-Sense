/**
 * StockSense AI Assistant API Client
 *
 * Provides strongly-typed HTTP calls to /api/ai/chat and /api/ai/tools.
 * Uses shared apiClient with automatic JWT Authorization header injection.
 */
import { apiClient } from '../../lib/apiClient';
import type {
  ChatRequestPayload,
  ChatApiResponse,
  AiToolsApiResponse,
} from './types';

export const aiApi = {
  /**
   * Send a chat prompt to the Grounded AI Assistant.
   * POST /api/ai/chat
   */
  async sendMessage(payload: ChatRequestPayload): Promise<ChatApiResponse> {
    return apiClient.post<ChatApiResponse>('/api/ai/chat', payload);
  },

  /**
   * List all registered deterministic system tools.
   * GET /api/ai/tools
   */
  async getTools(): Promise<AiToolsApiResponse> {
    return apiClient.get<AiToolsApiResponse>('/api/ai/tools');
  },
};
