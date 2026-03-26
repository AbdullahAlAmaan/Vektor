'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type MenuItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
};

const menuItems: MenuItem[] = [
  { title: 'Overview',     href: '/dashboard',    icon: LayoutDashboard, gradientFrom: '#a955ff', gradientTo: '#6366f1' },
  { title: 'Contributors', href: '/contributors', icon: Users,           gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { title: 'Evaluation',   href: '/evaluation',   icon: BarChart3,       gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { title: 'Hackathon',    href: '/hackathon',    icon: Zap,             gradientFrom: '#ffa9c6', gradientTo: '#f434e2' },
];

export function GradientMenu() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-3">
      {menuItems.map(({ title, href, icon: Icon, gradientFrom, gradientTo }) => {
        const active = pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              style={
                {
                  '--gf': gradientFrom,
                  '--gt': gradientTo,
                } as React.CSSProperties
              }
              className={cn(
                'group relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 shadow transition-all duration-300 ease-out',
                'hover:w-32 hover:shadow-none',
                active && 'w-32',
              )}
            >
              {/* Gradient bg — visible on hover or active */}
              <span
                className={cn(
                  'absolute inset-0 rounded-full transition-opacity duration-300',
                  'opacity-0 group-hover:opacity-100',
                  active && 'opacity-100',
                )}
                style={{
                  background: `linear-gradient(45deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />
              {/* Blur glow */}
              <span
                className={cn(
                  'absolute top-2.5 inset-x-0 h-full rounded-full -z-10 blur-[12px] transition-opacity duration-300 opacity-0 group-hover:opacity-40',
                  active && 'opacity-40',
                )}
                style={{
                  background: `linear-gradient(45deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />
              {/* Icon — visible when collapsed */}
              <span
                className={cn(
                  'relative z-10 transition-all duration-300',
                  'scale-100 group-hover:scale-0',
                  active && 'scale-0',
                )}
              >
                <Icon className="h-4 w-4 text-zinc-400" />
              </span>
              {/* Label — visible when expanded */}
              <span
                className={cn(
                  'absolute z-10 text-xs font-medium text-white uppercase tracking-wide',
                  'scale-0 transition-all duration-300 delay-100',
                  'group-hover:scale-100',
                  active && 'scale-100',
                )}
              >
                {title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
