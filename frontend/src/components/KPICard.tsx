'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedValue } from './AnimatedValue';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  postfix?: string;
  change?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

export function KPICard({ title, value, prefix = '', postfix = '', change, icon, subtitle }: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <span className="pointer-events-none absolute -right-6 -top-6 inline-flex h-16 w-16 rounded-full bg-white/[0.03]" />
      <span className="pointer-events-none absolute -right-2 -top-2 inline-flex h-8 w-8 rounded-full bg-white/[0.03]" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-white">
            <AnimatedValue value={value} prefix={prefix} postfix={postfix} />
          </h3>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive
                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              }
              <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-zinc-600">vs last run</span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-zinc-800/60 p-3">
          {icon}
        </div>
      </div>
    </div>
  );
}
