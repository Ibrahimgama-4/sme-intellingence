import type { InsightCard } from '@/types/domain';

const TYPE_STYLES: Record<InsightCard['type'], { dot: string; bg: string }> = {
  positive: { dot: 'bg-forest-500', bg: 'bg-forest-50' },
  negative: { dot: 'bg-risk', bg: 'bg-risk-100/50' },
  anomaly: { dot: 'bg-amber-500', bg: 'bg-amber-100/50' },
  neutral: { dot: 'bg-ink/30', bg: 'bg-ink/5' }
};

export function InsightBadge({ insight }: { insight: InsightCard }) {
  const style = TYPE_STYLES[insight.type];
  return (
    <div className={`rounded-lg p-3 ${style.bg}`}>
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
        <div>
          <div className="text-sm font-medium text-forest-900">{insight.title}</div>
          <div className="text-xs text-ink/60 mt-0.5">{insight.detail}</div>
        </div>
      </div>
    </div>
  );
}
