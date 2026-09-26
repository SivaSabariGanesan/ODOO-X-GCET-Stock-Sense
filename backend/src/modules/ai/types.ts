// ---------------------------------------------------------------------------
// AI Assistant Type Definitions
// ---------------------------------------------------------------------------

export interface UserContext {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestInput {
  message: string;
  conversationId?: string;
  confirmAction?: boolean;
  history?: ChatMessage[];
}

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

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  handler: (params: Record<string, any>, user: UserContext) => Promise<any>;
  requiresConfirmation?: boolean;
  requiredRole?: ("admin" | "manager")[];
}
