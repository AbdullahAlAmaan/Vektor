export const dynamic = 'force-dynamic';

import { getContributorProfile, getRecommendations, REPO_ID } from '@/lib/api';
import { ExpertiseChart } from '@/components/ExpertiseChart';
import { BGPattern } from '@/components/BGPattern';
import { ArrowLeft, GitCommit, Clock, Tag } from 'lucide-react';
import Link from 'next/link';

export default async function ContributorPage({ params }: { params: { id: string } }) {
  const [contributor, recommendations] = await Promise.all([
    getContributorProfile(params.id).catch(() => null),
    getRecommendations(params.id, REPO_ID, 10).catch(() => []),
  ]);

  if (!contributor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <p className="text-lg font-medium">Contributor not found.</p>
        <Link href="/contributors" className="mt-3 text-sm text-blue-400 hover:text-blue-300">
          ← Back to contributors
        </Link>
      </div>
    );
  }

  const profile = contributor.featureProfiles?.[0];
  const domainScores = (profile?.domainScores ?? {}) as Record<string, number>;
  const labelAffinity = (profile?.labelAffinity ?? {}) as Record<string, number>;
  const vol = profile?.contributionVolume ?? 0;
  const recency = profile?.recencyScore ?? 0;

  const topLabels = Object.entries(labelAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxLabelScore = topLabels[0]?.[1] ?? 1;

  return (
    <div className="relative space-y-8">
      <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />

      {/* Back + Header */}
      <div className="relative z-10 space-y-4">
        <Link href="/contributors" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Contributors
        </Link>

        <div className="flex items-center gap-5">
          {contributor.avatarUrl ? (
            <img
              src={contributor.avatarUrl}
              alt={contributor.username}
              className="h-16 w-16 rounded-full ring-2 ring-zinc-700"
            />
          ) : (
            <div className="h-16 w-16 rounded-full ring-2 ring-zinc-700 bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-400">
              {contributor.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{contributor.username}</h1>
            {contributor.displayName && (
              <p className="text-sm text-zinc-500 mt-0.5">{contributor.displayName}</p>
            )}
          </div>
          <div className="flex gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-center">
              <div className="flex items-center gap-1.5 justify-center text-zinc-500 mb-1">
                <GitCommit className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Contributions</span>
              </div>
              <p className="text-2xl font-bold text-white">{vol.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-center">
              <div className="flex items-center gap-1.5 justify-center text-zinc-500 mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Recency</span>
              </div>
              <p className="text-2xl font-bold text-white">{recency.toFixed(3)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Expertise + Label Affinity */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-5">Domain Expertise</h2>
          {Object.keys(domainScores).length > 0 ? (
            <ExpertiseChart data={domainScores} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-zinc-600">No domain data yet.</p>
              <p className="text-xs text-zinc-700 mt-1">File paths did not match any domain patterns.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-5">Label Affinity</h2>
          {topLabels.length > 0 ? (
            <div className="space-y-3">
              {topLabels.map(([label, score]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
                    <Tag className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 truncate">{label}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
                      style={{ width: `${(score / maxLabelScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-600 w-12 text-right flex-shrink-0">
                    {score.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-zinc-600">No label affinity data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Issues */}
      <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Recommended Issues</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20">
            X-Cache powered
          </span>
        </div>
        {recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={rec.issueId}
                className="flex items-center gap-4 rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-4 py-3 hover:border-zinc-700 transition-colors group"
              >
                <span className="text-zinc-700 text-xs font-mono w-5 flex-shrink-0">#{i + 1}</span>

                <span className="text-xs text-zinc-600 font-mono flex-1 truncate">{rec.issueId}</span>

                <div className="flex gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-zinc-600 mb-0.5">domain</p>
                    <p className="text-zinc-300 font-mono">{rec.breakdown.domainMatch.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-600 mb-0.5">label</p>
                    <p className="text-zinc-300 font-mono">{rec.breakdown.labelAffinityMatch.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-600 mb-0.5">recency</p>
                    <p className="text-zinc-300 font-mono">{rec.breakdown.recencyAlignment.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="h-1.5 w-16 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${Math.min(rec.score * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-blue-400 font-bold text-sm w-12 text-right font-mono">
                    {rec.score.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-zinc-600">No open issues to recommend right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
