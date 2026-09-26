import { useState, useEffect, useCallback, useRef } from 'react';
import { aiApi } from '../api';
import type { UiChatMessage, AiTool, PendingAction } from '../types';
import { ApiError } from '@/lib/apiClient';

const STORAGE_KEY = 'stocksense_ai_messages';
const CONV_KEY = 'stocksense_ai_conv_id';

const INITIAL_GREETING: UiChatMessage = {
  id: 'greeting_msg',
  role: 'assistant',
  content: `Hi! How can I help you with your inventory today?

You can ask about:
- Current product stock balances
- Low stock items below threshold
- Warehouse and location details
- Recent movements in the ledger`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export function useAiAssistant() {
  const [messages, setMessages] = useState<UiChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [INITIAL_GREETING];
  });

  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(CONV_KEY) || `conv_${Date.now()}`;
    } catch {
      return `conv_${Date.now()}`;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      sessionStorage.setItem(CONV_KEY, conversationId);
    } catch {
      // ignore
    }
  }, [messages, conversationId]);

  // Load available system tools on mount
  useEffect(() => {
    let cancelled = false;
    setToolsLoading(true);
    aiApi
      .getTools()
      .then((res) => {
        if (!cancelled && res.success && res.data?.tools) {
          setTools(res.data.tools);
        }
      })
      .catch((err) => {
        console.warn('Failed to load AI tools catalog:', err);
      })
      .finally(() => {
        if (!cancelled) setToolsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string, isConfirmation = false) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: UiChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      if (isConfirmation) setIsConfirming(true);

      try {
        const res = await aiApi.sendMessage({
          message: trimmed,
          conversationId,
          confirmAction: isConfirmation,
        });

        if (res.success && res.data) {
          const aiData = res.data;
          if (aiData.conversationId) {
            setConversationId(aiData.conversationId);
          }

          setPendingAction(aiData.actionPending || null);

          const assistantMsg: UiChatMessage = {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            content: aiData.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: aiData.sources || [],
            toolCalls: aiData.toolCalls || [],
            confirmationRequired: aiData.confirmationRequired || false,
            actionPending: aiData.actionPending || null,
          };

          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'An unexpected error occurred while communicating with the AI Assistant.';

        const errorBubble: UiChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error Processing Request**: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };

        setMessages((prev) => [...prev, errorBubble]);
      } finally {
        setIsLoading(false);
        setIsConfirming(false);
      }
    },
    [conversationId, isLoading]
  );

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction || isConfirming) return;
    await sendMessage('confirm', true);
  }, [pendingAction, isConfirming, sendMessage]);

  const clearConversation = useCallback(() => {
    const newConvId = `conv_${Date.now()}`;
    setConversationId(newConvId);
    setPendingAction(null);
    setMessages([INITIAL_GREETING]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(CONV_KEY, newConvId);
    } catch {
      // ignore
    }
  }, []);

  return {
    messages,
    isLoading,
    isConfirming,
    tools,
    toolsLoading,
    pendingAction,
    sendMessage,
    confirmPendingAction,
    clearConversation,
  };
}
