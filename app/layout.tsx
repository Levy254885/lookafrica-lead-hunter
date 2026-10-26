import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'LOOK AFRICA Lead Hunter', template: '%s | LOOK AFRICA Lead Hunter' },
  description:
    'Discover businesses, uncover website improvement opportunities, and track public project opportunities from one workspace built for developers and digital agencies.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-base">{children}</body>
    </html>
  );
}
