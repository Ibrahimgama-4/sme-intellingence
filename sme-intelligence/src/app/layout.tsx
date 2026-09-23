import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SME Intelligence — Understand Your Business',
  description: 'AI-powered business analytics for Nigerian SMEs. Upload your sales data and get instant dashboards, forecasts, and recommendations.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
