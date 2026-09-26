/**
 * StockSense AI Assistant Types
 * Matches the backend /api/ai endpoints and orchestrator contracts.
 */

export interface ToolCallRecord {
  tool: string;
  params: Record<string, any>;
  result?: any;
}

export interface PendingAction {
  tool: string;
  params: Record<string, any>;
  description: string;
}

export interface ChatResponseData {
  answer: string;
  sources: string[];
  toolCalls: ToolCallRecord[];
  confirmationRequired: boolean;
  actionPending: PendingAction | null;
  conversationId: string;
}

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  confirmAction?: boolean;
}

export interface ChatApiResponse {
  success: boolean;
  data: ChatResponseData;
  message?: string;
}

export interface AiTool {
  name: string;
  description: string;
  requiresConfirmation: boolean;
  requiredRole: string[];
}

export interface AiToolsApiResponse {
  success: boolean;
  data: {
    tools: AiTool[];
  };
}

export interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  toolCalls?: ToolCallRecord[];
  confirmationRequired?: boolean;
  actionPending?: PendingAction | null;
  isError?: boolean;
}
