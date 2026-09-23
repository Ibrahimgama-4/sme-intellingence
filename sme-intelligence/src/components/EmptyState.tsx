import Link from 'next/link';

export function EmptyState({
  title, text, ctaHref, ctaLabel
}: { title: string; text: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="p-8 md:p-16 flex flex-col items-center text-center max-w-md mx-auto mt-12">
      <h2 className="font-display text-xl font-semibold text-forest-900">{title}</h2>
      <p className="text-sm text-ink/60 mt-2">{text}</p>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="mt-6 inline-flex bg-forest-500 text-paper px-5 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
