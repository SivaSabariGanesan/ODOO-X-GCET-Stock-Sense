import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Wrench,
  Loader2,
  CornerDownLeft,
  Copy,
  Check,
  Package,
  Layers,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/cn';

const SUGGESTED_PROMPTS = [
  {
    icon: AlertTriangle,
    title: 'Low Stock Alerts',
    prompt: 'Which products are currently low in stock below safety reorder limits?',
  },
  {
    icon: Boxes,
    title: 'Warehouse Hierarchy',
    prompt: 'List all active warehouses and their internal location hierarchy.',
  },
  {
    icon: Package,
    title: 'Stock Balances',
    prompt: 'Show the current stock breakdown for Resistor 10k Ohm across all warehouses.',
  },
  {
    icon: Layers,
    title: 'Ledger Audit Trail',
    prompt: 'List the 5 most recent stock movements recorded in the immutable ledger.',
  },
  {
    icon: HelpCircle,
    title: 'System API Docs',
    prompt: 'What API endpoints and workflow statuses exist for outbound Deliveries?',
  },
];

// Helper to render basic markdown formatting (bold, code, bullet lists)
function renderFormattedMessage(content: string) {
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    // Bullet point lines
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletContent = line.trim().slice(2);
      return (
        <li key={idx} className="ml-4 list-disc text-slate-700 my-1 leading-relaxed">
          {formatInline(bulletContent)}
        </li>
      );
    }

    // Numbered lists
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return (
        <li key={idx} className="ml-4 list-decimal text-slate-700 my-1 leading-relaxed">
          {formatInline(numMatch[2] ?? '')}
        </li>
      );
    }

    // Empty line separator
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    // Regular line
    return (
      <p key={idx} className="my-1 text-slate-800 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });
}

function formatInline(text: string): React.ReactNode[] {
  // Split on bold (**text**) and code (`code`)
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
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-brand-dark font-mono text-[11.5px]"
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

export function AiAssistantPage() {
  const {
    messages,
    isLoading,
    isConfirming,
    tools,
    toolsLoading,
    pendingAction,
    sendMessage,
    confirmPendingAction,
    clearConversation,
  } = useAiAssistant();

  const [input, setInput] = useState('');
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info('Copied', 'Message content copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleToolExpand = (msgId: string, toolIdx: number) => {
    const key = `${msgId}_${toolIdx}`;
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* ── Top Bar / Header ─────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900 leading-none">
                StockSense AI Copilot
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic, zero-hallucination assistant connected to PostgreSQL business services
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Registered Tools Toggle */}
          <button
            type="button"
            onClick={() => setShowToolsPanel(!showToolsPanel)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer',
              showToolsPanel
                ? 'bg-brand/10 border-brand/30 text-brand-dark'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Wrench className="w-3.5 h-3.5 text-brand" />
            <span>Tools Catalog ({tools.length})</span>
          </button>

          {/* Clear History */}
          <button
            type="button"
            onClick={clearConversation}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Clear current conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Tools Drawer (Optional) + Chat Stream ──────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-slate-50/50">
        {/* Chat Messages Scroll Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-3xl',
                    isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isUser ? 'You' : 'StockSense AI'}
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={cn(
                      'p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs relative group transition-all',
                      isUser
                        ? 'bg-[#5a4f80] text-white rounded-tr-xs'
                        : msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                    )}
                  >
                    {/* Message Body */}
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">
                        {renderFormattedMessage(msg.content)}
                      </div>
                    )}

                    {/* Sources Badge (Grounded Proof) */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Database className="w-3 h-3 text-brand" /> Verified Grounding:
                        </span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-mono border border-slate-200"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tool Calls Execution Details */}
                    {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-400" /> Executed System Tools:
                        </span>
                        {msg.toolCalls.map((tc, idx) => {
                          const isExp = !!expandedTools[`${msg.id}_${idx}`];
                          return (
                            <div
                              key={idx}
                              className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-md p-1.5 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleToolExpand(msg.id, idx)}
                                className="w-full flex items-center justify-between text-left text-brand-dark font-medium cursor-pointer"
                              >
                                <span className="flex items-center gap-1">
                                  {isExp ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>{tc.tool}</span>
                                </span>
                                <span className="text-[10px] text-slate-400">params / payload</span>
                              </button>
                              {isExp && (
                                <pre className="mt-1 p-2 bg-slate-100 rounded text-[10px] text-slate-700 overflow-x-auto">
                                  {JSON.stringify(tc.params, null, 2)}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pending Action Confirmation Card */}
                    {!isUser && msg.confirmationRequired && msg.actionPending && (
                      <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Action Confirmation Safeguard</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          This operation will modify live database inventory records.
                        </p>
                        <div className="p-2 bg-white/80 rounded border border-amber-200 text-xs font-mono text-slate-700">
                          {msg.actionPending.description || msg.actionPending.tool}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            isLoading={isConfirming}
                            onClick={confirmPendingAction}
                            className="text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Confirm & Execute Action
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isConfirming}
                            onClick={() => sendMessage('cancel')}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Copy to clipboard button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className={cn(
                        'absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
                        isUser
                          ? 'text-white/70 hover:text-white hover:bg-white/10'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      )}
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5 mr-auto max-w-lg">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 rounded-tl-xs shadow-2xs flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-xs text-slate-600 font-medium">
                    Querying live PostgreSQL database & services...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (Chips) */}
          {messages.length <= 1 && (
            <div className="px-4 sm:px-6 py-2 bg-white/70 border-t border-slate-200/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand" /> Suggested Operational Inquiries:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SUGGESTED_PROMPTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="p-2.5 text-left rounded-lg border border-slate-200 bg-white hover:border-brand/40 hover:bg-brand/5 transition-all text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 group-hover:text-brand-dark mb-0.5">
                        <Icon className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.prompt}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Input Bar ────────────────────────────────────────────────── */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
            <div className="flex items-end gap-2 max-w-4xl mx-auto relative">
              <div className="flex-1 relative rounded-xl border border-slate-200 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all shadow-2xs">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about products, stock levels, warehouse locations, ledger movements, or API docs..."
                  rows={1}
                  className="w-full resize-none px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none max-h-32 bg-transparent"
                  style={{ minHeight: '42px' }}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-[42px] px-4 rounded-xl shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline mr-1 text-xs">Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
            <div className="text-center mt-1.5">
              <span className="text-[10px] text-slate-400">
                Press <kbd className="font-mono bg-slate-100 px-1 rounded text-slate-600">Enter</kbd> to send, <kbd className="font-mono bg-slate-100 px-1 rounded text-slate-600">Shift + Enter</kbd> for newline
              </span>
            </div>
          </div>
        </div>

        {/* ── Collapsible Right Drawer: Registered Tools Catalog ─────────── */}
        {showToolsPanel && (
          <div className="w-80 border-l border-slate-200/80 bg-white flex flex-col shrink-0 overflow-hidden shadow-lg animate-in slide-in-from-right duration-200">
            <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Registered Grounded Tools
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowToolsPanel(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {toolsLoading ? (
                <div className="flex items-center justify-center p-6 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-brand" />
                  Loading tools catalog...
                </div>
              ) : tools.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No tools returned by backend.
                </div>
              ) : (
                tools.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-brand-dark text-[11.5px]">
                        {t.name}
                      </span>
                      {t.requiresConfirmation ? (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Mutating
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600">
                          Read-Only
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {t.description}
                    </p>
                    {t.requiredRole && t.requiredRole.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-slate-400">
                        Roles: <span className="font-mono text-slate-600">{t.requiredRole.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
