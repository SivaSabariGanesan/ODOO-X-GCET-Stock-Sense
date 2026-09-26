import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  Database,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Package,
  Boxes,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/cn';

const QUICK_PROMPTS = [
  'Which products are low in stock?',
  'List warehouse locations',
  'Recent stock ledger movements',
];

function renderFormattedMessage(content: string) {
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletContent = line.trim().slice(2);
      return (
        <li key={idx} className="ml-3.5 list-disc text-slate-700 my-0.5 leading-relaxed">
          {formatInline(bulletContent)}
        </li>
      );
    }

    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return (
        <li key={idx} className="ml-3.5 list-decimal text-slate-700 my-0.5 leading-relaxed">
          {formatInline(numMatch[2] ?? '')}
        </li>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }

    return (
      <p key={idx} className="my-0.5 text-slate-800 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });
}

function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {matchedText.slice(2, -2)}
        </strong>
      );
    } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-brand-dark font-mono text-[11px]"
        >
          {matchedText.slice(1, -1)}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    messages,
    isLoading,
    isConfirming,
    pendingAction,
    sendMessage,
    confirmPendingAction,
    clearConversation,
  } = useAiAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info('Copied', 'Message copied to clipboard.');
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* ── Chat Window Popup ─────────────────────────────────────────── */}
      {isOpen && (
        <div className="mb-3 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#5a4f80] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold leading-tight">StockSense Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10.5px] text-white/80">Online • Live Database</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearConversation}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[85%]',
                    isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-2xl text-xs leading-relaxed shadow-2xs relative group transition-all',
                      isUser
                        ? 'bg-[#5a4f80] text-white rounded-tr-xs'
                        : msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-0.5">{renderFormattedMessage(msg.content)}</div>
                    )}

                    {/* Sources Badge */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1">
                        <span className="text-[9.5px] font-semibold text-slate-400 flex items-center gap-0.5">
                          <Database className="w-2.5 h-2.5 text-brand" />
                        </span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9.5px] font-mono border border-slate-200"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Confirmation Banner */}
                    {!isUser && msg.confirmationRequired && msg.actionPending && (
                      <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-1 text-amber-800 text-[11px] font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Confirmation Required</span>
                        </div>
                        <p className="text-[10.5px] text-amber-900">
                          {msg.actionPending.description || msg.actionPending.tool}
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            disabled={isConfirming}
                            onClick={confirmPendingAction}
                            className="px-2 py-1 rounded bg-brand text-white text-[11px] font-medium hover:bg-brand-dark transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={isConfirming}
                            onClick={() => sendMessage('cancel')}
                            className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 text-[11px] font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className={cn(
                        'absolute top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
                        isUser
                          ? 'text-white/70 hover:text-white'
                          : 'text-slate-400 hover:text-slate-600'
                      )}
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {isLoading && (
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 rounded-tl-xs shadow-2xs flex items-center gap-2 max-w-[70%]">
                <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                <span>Checking records...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (Chips) */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 bg-white border-t border-slate-200/70 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-brand/10 hover:text-brand-dark border border-slate-200 hover:border-brand/30 rounded-md text-slate-600 transition-all text-left cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, stock, locations..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-lg bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title="Send"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Action Button (FAB) ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer select-none',
          isOpen
            ? 'bg-slate-800 text-white hover:bg-slate-900 rotate-90 duration-200'
            : 'bg-[#71639e] text-white hover:bg-[#5a4f80] hover:scale-105 active:scale-95 shadow-brand/25'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open inventory chat'}
        title={isOpen ? 'Close chat' : 'StockSense Assistant'}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
