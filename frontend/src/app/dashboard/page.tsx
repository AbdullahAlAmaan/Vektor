export const dynamic = 'force-dynamic';

import { getHealth, getRepoContributors, getRepos } from '@/lib/api';
import { BGPattern } from '@/components/BGPattern';
import { KPICard } from '@/components/KPICard';
import { SystemHealth } from '@/components/SystemHealth';
import { Leaderboard } from '@/components/Leaderboard';
import { HeroSection } from '@/components/ui/hero-3';
import { Users, GitCommit, Database, Cpu } from 'lucide-react';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { repoId?: string };
}) {
  const repos = await getRepos().catch(() => []);
  const repoId = searchParams.repoId ?? repos[0]?.id;
  const repo = repos.find((r) => r.id === repoId) ?? repos[0];

  const [health, contributors] = await Promise.all([
    getHealth().catch(() => ({ status: 'error', checks: {} as Record<string, string> })),
    repoId ? getRepoContributors(repoId).catch(() => []) : Promise.resolve([]),
  ]);

  const checks = health.checks as Record<string, string>;

  const totalProfiles = contributors.reduce((sum, c) => sum + c.featureProfiles.length, 0);
  const totalContributions = contributors.reduce(
    (sum, c) => sum + (c.featureProfiles[0]?.contributionVolume ?? 0),
    0
  );

  const kpis = [
    { title: 'Contributors', value: contributors.length, icon: <Users className="h-5 w-5 text-blue-400" />, subtitle: repo?.fullName ?? 'no repo selected' },
    { title: 'Feature Profiles', value: totalProfiles, icon: <Database className="h-5 w-5 text-violet-400" />, subtitle: 'expertise vectors' },
    { title: 'Total Contributions', value: totalContributions, icon: <GitCommit className="h-5 w-5 text-cyan-400" />, subtitle: 'commits + PRs tracked' },
    { title: 'Model Version', value: 3, icon: <Cpu className="h-5 w-5 text-emerald-400" />, prefix: 'v', subtitle: 'scoring formula active' },
  ];

  const healthServices = Object.entries(checks).map(([name, status]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    status,
  }));

  const topContributors = [...contributors]
    .sort((a, b) => (b.featureProfiles[0]?.contributionVolume ?? 0) - (a.featureProfiles[0]?.contributionVolume ?? 0))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      username: c.username,
      avatarUrl: c.avatarUrl,
      contributions: c.featureProfiles[0]?.contributionVolume ?? 0,
      recencyScore: c.featureProfiles[0]?.recencyScore ?? 0,
    }));

  const openIssueCount = contributors.reduce((sum, c) => {
    const profile = c.featureProfiles[0];
    return sum + (profile ? 1 : 0);
  }, 0);

  return (
    <div className="relative space-y-8">
      <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />

      {/* Hero section */}
      <div className="relative z-10">
        <HeroSection
          repoName={repo?.fullName}
          contributorCount={contributors.length}
          issueCount={openIssueCount}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealth services={healthServices} />
        <Leaderboard contributors={topContributors} />
      </div>
    </div>
  );
}
