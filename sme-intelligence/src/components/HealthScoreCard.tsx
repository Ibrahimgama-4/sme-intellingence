'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HealthScore } from '@/types/domain';

export function HealthScoreCard({ score }: { score: HealthScore }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const color = score.overall >= 75 ? '#1B7A4D' : score.overall >= 50 ? '#E8A33D' : '#C0392B';

  return (
    <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-forest-900">Business Health</h2>
        <div className="font-display text-3xl font-semibold" style={{ color }}>{score.overall}<span className="text-base text-ink/40"> / 100</span></div>
      </div>
      <p className="text-xs text-ink/50 mt-1">Average of six measurable components below — never an opaque AI guess. Tap any row to see how it's calculated.</p>

      <div className="mt-4 space-y-1">
        {score.components.map((c) => (
          <div key={c.key} className="border-b border-forest-900/5 last:border-0">
            <button
              onClick={() => setExpanded(expanded === c.key ? null : c.key)}
              className="w-full flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-ink/80">{c.label}</span>
              <span className="flex items-center gap-2">
                <span className="w-24 h-1.5 rounded-full bg-forest-900/8 overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${c.score}%`, background: barColor(c.score) }} />
                </span>
                <span className="font-medium text-forest-900 w-8 text-right">{c.score}</span>
                <ChevronDown size={14} className={`text-ink/40 transition-transform ${expanded === c.key ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {expanded === c.key && (
              <p className="text-xs text-ink/60 pb-3 -mt-1">{c.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function barColor(score: number) {
  if (score >= 75) return '#1B7A4D';
  if (score >= 50) return '#E8A33D';
  return '#C0392B';
}
