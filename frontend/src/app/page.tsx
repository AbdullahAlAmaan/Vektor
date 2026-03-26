'use client';

import { useRouter } from 'next/navigation';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';

export default function LandingPage() {
  const router = useRouter();

  return (
    <HeroGeometric
      badge="GitHub Intelligence Platform"
      title1="Know Your Team."
      title2="Ship Smarter."
      onDashboard={() => router.push('/dashboard')}
      onHackathon={() => router.push('/hackathon')}
    />
  );
}
