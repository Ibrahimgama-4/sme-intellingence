'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useBusinessData } from '@/lib/useBusinessData';
import { answerBusinessQuestion } from '@/lib/analytics/assistant';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

interface Message { role: 'user' | 'assistant'; text: string; }

const SUGGESTIONS = [
  'What were my best-selling products this month?',
  'What were my biggest expenses?',
  'Am I making or losing money?',
  'Give me five actions I can take to improve profitability.'
];

export default function AssistantPage() {
  const { business, sales, expenses, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm the SME Intelligence Assistant. Ask me anything about your business — I'll only answer using your actual uploaded data." }
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function ask(question: string) {
    if (!question.trim()) return;
    const { answer } = answerBusinessQuestion(question, sales, expenses, currency);
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'assistant', text: answer }]);
    setInput('');
  }

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="Upload data to talk to your assistant" text="The AI Assistant answers using your real business metrics — upload a spreadsheet first." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      <h1 className="font-display text-2xl font-semibold text-forest-900">SME Intelligence Assistant</h1>
      <p className="text-sm text-ink/60 mt-1">Answers are generated from your business's real metrics — never invented.</p>

      <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl2 px-4 py-3 text-sm whitespace-pre-line ${
              m.role === 'user' ? 'bg-forest-900 text-paper' : 'bg-white border border-forest-900/8 text-ink/90'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="text-xs bg-forest-50 hover:bg-forest-100 text-forest-900 px-3 py-1.5 rounded-full transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-4 flex gap-2 bg-white border border-forest-900/15 rounded-lg p-1.5"
      >
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your business…"
          className="flex-1 px-3 py-2 outline-none text-sm bg-transparent"
        />
        <button type="submit" className="bg-forest-500 text-paper px-4 py-2 rounded-md hover:bg-forest-600 transition-colors">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
