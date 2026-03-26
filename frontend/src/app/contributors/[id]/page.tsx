export const dynamic = 'force-dynamic';

import { getContributorProfile, getRecommendations, getRepos } from '@/lib/api';
import { BGPattern } from '@/components/BGPattern';
import { ContributorProfileBlock } from '@/components/ui/glassmorphism-portfolio-block-shadcnui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ContributorPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { repoId?: string };
}) {
  const repos = await getRepos().catch(() => []);
  const repoId = searchParams.repoId ?? repos[0]?.id;
  const repo = repos.find((r) => r.id === repoId) ?? repos[0];

  const [contributor, recommendations] = await Promise.all([
    getContributorProfile(params.id).catch(() => null),
    repoId ? getRecommendations(params.id, repoId, 10).catch(() => []) : Promise.resolve([]),
  ]);

  const backHref = repoId ? `/contributors?repoId=${repoId}` : '/contributors';

  if (!contributor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <p className="text-lg font-medium">Contributor not found.</p>
        <Link href={backHref} className="mt-3 text-sm text-blue-400 hover:text-blue-300">← Back</Link>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />

      <div className="relative z-10">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Contributors
        </Link>
      </div>

      <div className="relative z-10">
        <ContributorProfileBlock
          contributor={contributor}
          recommendations={recommendations}
          repo={repo}
        />
      </div>
    </div>
  );
}
