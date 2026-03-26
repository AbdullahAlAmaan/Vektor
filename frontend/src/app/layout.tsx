import type { Metadata } from 'next';
import './globals.css';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';

export const metadata: Metadata = {
  title: 'Vektor',
  description: 'GitHub Intelligence Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
