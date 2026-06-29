import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, Paperclip, Trash2, Sparkles, ChevronDown,
  AlertTriangle, RotateCcw,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface Props {
  onClose: () => void;
  equipmentContext?: {
    make?: string;
    model?: string;
    refrigerant?: string;
    capacity?: string;
    voltage?: string;
    unitTag?: string;
    customer?: string;
    site?: string;
  };
}

const SUGGESTED_PROMPTS = [
  'What should my superheat be on an R-410A system?',
  'Walk me through economizer operation.',
  'What could cause intermittent cooling?',
  'Explain low suction pressure.',
  'What does a high subcooling reading mean?',
  'How do I check for a refrigerant leak?',
  'What should I check on a unit not cooling?',
  'Explain TXV operation.',
];

function msgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildConversationSummary(messages: Message[]): string {
  if (messages.length === 0) return '';
  const lines = messages.map(m =>
    `${m.role === 'user' ? 'Technician' : 'Assistant'}: ${m.content.slice(0, 400)}`
  );
  return lines.join('\n\n');
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export function JmpAiAssistantModal({ onClose, equipmentContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setShowSuggested(false);
    setError(null);

    const userMsg: Message = { id: msgId(), role: 'user', content: question, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = buildConversationSummary(messages);
      const res = await fetch('/api/hvac/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          equipmentContext: equipmentContext ?? {},
          sessionContext: conversationHistory
            ? { serviceHistory: conversationHistory }
            : {},
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { answer?: string; error?: string };
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: msgId(),
        role: 'assistant',
        content: data.answer ?? 'No response. Please try again.',
        ts: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Assistant unavailable. Please try again.';
      setError(errText);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
    setShowSuggested(true);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const hasContext = equipmentContext && Object.values(equipmentContext).some(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-900/50 border border-purple-700/50 flex items-center justify-center">
              <Sparkles size={13} className="text-purple-400" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-none">AI Field Assistant</div>
              <div className="text-[9px] text-purple-400/80 mt-0.5">GPT-4o · HVAC Expert</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center active:scale-90 transition-transform"
                title="Clear conversation"
              >
                <Trash2 size={13} className="text-gray-400" />
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center active:scale-90 transition-transform">
              <X size={15} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Equipment context badge */}
        {hasContext && (
          <div className="mt-2 flex items-center gap-1.5 bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="text-[10px] text-blue-300 truncate">
              Context: {[equipmentContext?.make, equipmentContext?.model, equipmentContext?.unitTag].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      {/* ── Conversation ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome / Intro */}
        {messages.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-purple-400" />
                <span className="text-xs font-bold text-purple-300">UnitDown AI Assistant</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                I'm your on-site HVAC expert. Ask me about troubleshooting, fault codes, refrigerant, 
                electrical, sequence of operation, parts, or anything else you're dealing with in the field.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                I remember our conversation and can build on previous answers.
              </p>
            </div>

            {/* Suggested prompts */}
            <AnimatePresence>
              {showSuggested && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Suggested questions
                    </span>
                    <button onClick={() => setShowSuggested(false)}
                      className="text-[10px] text-gray-600 flex items-center gap-0.5">
                      <ChevronDown size={10} /> hide
                    </button>
                  </div>
                  <div className="space-y-2">
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => sendMessage(p)}
                        className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-300 hover:border-purple-700/60 hover:text-white hover:bg-gray-800 active:scale-[0.98] transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <motion.div key={msg.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-purple-900/50 border border-purple-700/40 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles size={11} className="text-purple-400" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-md'
            }`}>
              {msg.role === 'assistant'
                ? msg.content.split('\n').map((line, i) => (
                    <div key={i} className={line === '' ? 'h-2' : ''}>
                      {line !== '' && <MarkdownText text={line} />}
                    </div>
                  ))
                : msg.content
              }
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-start">
            <div className="w-6 h-6 rounded-lg bg-purple-900/50 border border-purple-700/40 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <Sparkles size={11} className="text-purple-400 animate-pulse" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map(delay => (
                <motion.div key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.8, delay: delay / 1000, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-950/30 border border-red-800/40 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-300">{error}</p>
              <button onClick={() => { setError(null); sendMessage(messages[messages.length - 1]?.content ?? ''); }}
                className="flex items-center gap-1 mt-2 text-[10px] text-red-400 font-semibold active:scale-95 transition-transform">
                <RotateCcw size={10} /> Retry
              </button>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div className="border-t border-gray-800 bg-gray-900 px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* Attach button — placeholder */}
          <button
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform opacity-50"
            title="Attach photo (coming soon)"
            disabled
          >
            <Paperclip size={15} className="text-gray-400" />
          </button>

          {/* Text input */}
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-3 py-2 focus-within:border-purple-600 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about HVAC, fault codes, refrigerant…"
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none leading-relaxed max-h-28 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>

          {/* Voice button — placeholder */}
          <button
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform opacity-50"
            title="Voice input (coming soon)"
            disabled
          >
            <Mic size={15} className="text-gray-400" />
          </button>

          {/* Send */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-[9px] text-gray-600 text-center mt-2">
          AI responses are for field guidance only · Always verify with equipment manuals
        </p>
      </div>
    </motion.div>
  );
}
