'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { GradientMenu } from './ui/gradient-menu';
import { RepoSelector } from './RepoSelector';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-indigo-400">⬡</span>
            <span className="text-white ml-1">Vektor</span>
          </span>
        </Link>

        <div className="flex-1">
          <GradientMenu />
        </div>

        <Suspense fallback={<div className="w-32 h-7 rounded-md bg-zinc-800/50 animate-pulse" />}>
          <RepoSelector />
        </Suspense>
      </div>
    </nav>
  );
}
