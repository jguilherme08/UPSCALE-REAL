import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Realistic Image Upscaler',
  description: 'CPU-friendly Real-ESRGAN upscaler ready for Vercel.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface text-slate-100 min-h-screen antialiased">{children}</body>
    </html>
  );
}
