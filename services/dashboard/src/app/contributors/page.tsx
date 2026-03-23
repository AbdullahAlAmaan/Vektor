export const dynamic = 'force-dynamic';

import { getRepoContributors, REPO_ID } from '@/lib/api';
import { BGPattern } from '@/components/BGPattern';
import { Users } from 'lucide-react';

const DOMAIN_COLORS: Record<string, string> = {
  backend:  'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  frontend: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',
  testing:  'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  auth:     'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
  database: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',
  ci:       'bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20',
  docs:     'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20',
};

export default async function ContributorsPage() {
  const contributors = await getRepoContributors(REPO_ID).catch(() => []);

  const sorted = [...contributors].sort((a, b) => {
    const volA = a.featureProfiles[0]?.contributionVolume ?? 0;
    const volB = b.featureProfiles[0]?.contributionVolume ?? 0;
    return volB - volA;
  });

  const maxVol = sorted[0]?.featureProfiles[0]?.contributionVolume ?? 1;

  return (
    <div className="relative space-y-6">
      <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />

      <div className="relative z-10 flex items-center gap-3">
        <div className="rounded-lg bg-zinc-800/60 p-2.5">
          <Users className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contributors</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{contributors.length} contributors — expressjs/express</p>
        </div>
      </div>

      <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">#</th>
              <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Contributor</th>
              <th className="text-right px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Contributions</th>
              <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500 w-40">Activity</th>
              <th className="text-right px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Recency</th>
              <th className="text-center px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Top Domain</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sorted.map((c, i) => {
              const profile = c.featureProfiles[0];
              const vol = profile?.contributionVolume ?? 0;
              const recency = profile?.recencyScore ?? 0;
              const domains = profile?.domainScores as Record<string, number> | undefined;
              const topDomain = domains
                ? Object.entries(domains).sort((a, b) => b[1] - a[1])[0]?.[0]
                : null;
              const domainClass = topDomain ? DOMAIN_COLORS[topDomain] ?? 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20' : '';

              return (
                <tr key={c.id} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-600 text-xs font-mono">{String(i + 1).padStart(2, '0')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img
                          src={c.avatarUrl}
                          alt={c.username}
                          className="h-8 w-8 rounded-full ring-2 ring-zinc-700 group-hover:ring-blue-500/40 transition-all flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full ring-2 ring-zinc-700 bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                          {c.username[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {c.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-zinc-200">{vol.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${(vol / maxVol) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs text-zinc-400">{recency.toFixed(3)}</td>
                  <td className="px-5 py-3.5 text-center">
                    {topDomain ? (
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${domainClass}`}>
                        {topDomain}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={`/contributors/${c.id}`}
                      className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
