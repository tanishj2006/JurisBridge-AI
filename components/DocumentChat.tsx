'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Bot, User, Bookmark } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface DocumentChatProps {
  documentText: string;
  onSelectClauseCitation?: (clauseId: string) => void;
}

export default function DocumentChat({
  documentText,
  onSelectClauseCitation,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your JurisBridge AI grounded legal assistant. Ask me any question about your document, and I will cite specific clauses in my answer.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];

    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          chatHistory: newHistory,
          question: userMsg.content,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get chat response');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.content,
          citedClauseIds: data.citedClauseIds || [],
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I ran into an error processing your request: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside
      aria-label="Document Interactive Q&A Assistant"
      className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <h3 className="text-base font-bold text-white">Grounded Document Q&A</h3>
        </div>
        <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold">
          Strict AI Grounding
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
              }`}
            >
              <p>{msg.content}</p>

              {/* Cited Clause Badges */}
              {msg.citedClauseIds && msg.citedClauseIds.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Bookmark className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                    Citations:
                  </span>
                  {msg.citedClauseIds.map((cid, cidx) => (
                    <button
                      key={cidx}
                      onClick={() => onSelectClauseCitation?.(cid)}
                      className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 text-[11px] font-mono font-semibold transition focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      aria-label={`Jump to cited clause ${cid}`}
                    >
                      [{cid}]
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" aria-hidden="true" />
            <span>Searching document and formulating answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-3 border-t border-slate-800 pt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this contract..."
          disabled={isLoading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Ask a question about the document"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Send question"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
