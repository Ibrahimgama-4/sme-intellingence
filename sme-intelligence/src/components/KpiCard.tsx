import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  changePercent: number | null; // null = no comparable previous period
  invertColor?: boolean; // true for metrics where "up" is bad (e.g. expenses)
}

export function KpiCard({ label, value, changePercent, invertColor }: KpiCardProps) {
  const isPositive = changePercent !== null && changePercent >= 0;
  const goodDirection = invertColor ? !isPositive : isPositive;

  return (
    <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
      <div className="text-sm text-ink/50">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-semibold text-forest-900 mt-2">{value}</div>
      {changePercent !== null ? (
        <div className={`flex items-center gap-1 text-xs mt-2 ${goodDirection ? 'text-forest-600' : 'text-risk'}`}>
          {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          <span>{Math.abs(changePercent).toFixed(1)}% vs previous period</span>
        </div>
      ) : (
        <div className="text-xs mt-2 text-ink/40">No prior period to compare</div>
      )}
    </div>
  );
}
