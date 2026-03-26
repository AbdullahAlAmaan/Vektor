'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <>
      {!isLanding && <NavBar />}
      {isLanding ? (
        <>{children}</>
      ) : (
        <main className="relative px-6 py-8 max-w-7xl mx-auto">{children}</main>
      )}
    </>
  );
}
