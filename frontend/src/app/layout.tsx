import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Vektor',
  description: 'GitHub Intelligence Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <NavBar />
        <main className="relative px-6 py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
