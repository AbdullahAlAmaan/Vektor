'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BarChart3 } from 'lucide-react';
import { Suspense } from 'react';
import { RepoSelector } from './RepoSelector';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/contributors', label: 'Contributors', icon: Users },
  { href: '/evaluation', label: 'Evaluation', icon: BarChart3 },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-blue-400">⬡</span>
            <span className="text-white ml-1">Vektor</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        <Suspense fallback={<div className="w-32 h-7 rounded-md bg-zinc-800/50 animate-pulse" />}>
          <RepoSelector />
        </Suspense>
      </div>
    </nav>
  );
}
