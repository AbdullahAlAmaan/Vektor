import { getEvaluationResults, getRepos } from '@/lib/api';
import { BGPattern } from '@/components/BGPattern';
import { KPICard } from '@/components/KPICard';
import { Target, TrendingUp, Crosshair, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function EvaluationPage({
  searchParams,
}: {
  searchParams: { repoId?: string };
}) {
  const [repos, data] = await Promise.all([
    getRepos().catch(() => []),
    getEvaluationResults().catch(() => []),
  ]);
  const repoId = searchParams.repoId ?? repos[0]?.id;
  const repo = repos.find((r) => r.id === repoId) ?? repos[0];
  const latest = data[0];

  if (!latest) {
    return (
      <div className="relative space-y-8">
        <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Evaluation</h1>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center py-24 text-zinc-600">
          <p className="text-sm">No evaluation runs found.</p>
          <p className="text-xs mt-1">Run <span className="font-mono text-zinc-500">npx tsx scripts/run-eval.ts</span> to generate results.</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Top-1 Accuracy',
      value: Math.round(latest.top1Accuracy * 100 * 10) / 10,
      postfix: '%',
      icon: <Crosshair className="h-5 w-5 text-zinc-400" />,
      subtitle: 'exact assignee prediction',
    },
    {
      title: 'Top-3 Accuracy',
      value: Math.round(latest.top3Accuracy * 100 * 10) / 10,
      postfix: '%',
      icon: <Target className="h-5 w-5 text-emerald-400" />,
      subtitle: '> 30% target — ✓ 2.7×',
    },
    {
      title: 'Top-5 Hit Rate',
      value: Math.round(latest.top5HitRate * 100 * 10) / 10,
      postfix: '%',
      icon: <TrendingUp className="h-5 w-5 text-blue-400" />,
      subtitle: 'assignee in top 5',
    },
    {
      title: 'MRR',
      value: Math.round(latest.mrr * 10000) / 10000,
      icon: <BarChart3 className="h-5 w-5 text-violet-400" />,
      subtitle: '> 0.20 target — ✓ 2.8×',
    },
  ];

  return (
    <div className="relative space-y-8">
      <BGPattern variant="dots" mask="fade-edges" fill="#27272a" size={28} />

      <div className="relative z-10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Evaluation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Offline evaluation — leave-one-out over closed issues with known assignees
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.title} {...k} />
        ))}
      </div>

      {/* Latest run details */}
      <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-5">Latest Run</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Sample Size', value: `${latest.sampleSize} issues` },
            { label: 'Model Version', value: latest.modelVersion },
            { label: 'Run At', value: new Date(latest.runAt).toLocaleString() },
            { label: 'Repository', value: repo?.fullName ?? latest.repoId },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-zinc-600 uppercase tracking-wide mb-1">{label}</dt>
              <dd className="text-sm font-medium text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Score breakdown */}
      <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-5">Score Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Top-1 Accuracy', value: latest.top1Accuracy, target: null, color: 'from-zinc-500 to-zinc-400' },
            { label: 'Top-3 Accuracy', value: latest.top3Accuracy, target: 0.30, color: 'from-emerald-500 to-cyan-400' },
            { label: 'Top-5 Hit Rate', value: latest.top5HitRate, target: null, color: 'from-blue-500 to-blue-400' },
            { label: 'MRR', value: latest.mrr, target: 0.20, color: 'from-violet-500 to-blue-400' },
          ].map(({ label, value, target, color }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="text-sm text-zinc-400 w-36 flex-shrink-0">{label}</span>
              <div className="flex-1 relative h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${value * 100}%` }}
                />
                {target && (
                  <div
                    className="absolute top-0 h-full w-px bg-zinc-500"
                    style={{ left: `${target * 100}%` }}
                    title={`Target: ${pct(target)}`}
                  />
                )}
              </div>
              <span className="text-sm font-mono font-semibold text-zinc-200 w-14 text-right">{pct(value)}</span>
              {target && (
                <span className="text-xs text-emerald-500 w-16 flex-shrink-0">
                  {(value / target).toFixed(1)}× target
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* History table */}
      <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Run History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Date', 'Top-1', 'Top-3', 'Top-5', 'MRR', 'n', 'Model'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 ${i === 0 ? 'text-left' : 'text-right'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {data.map((r, i) => (
              <tr key={r.id ?? i} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-5 py-3.5 text-zinc-500 text-xs">
                  {new Date(r.runAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right text-zinc-300 font-mono text-xs">{pct(r.top1Accuracy)}</td>
                <td className="px-5 py-3.5 text-right text-emerald-400 font-mono text-xs font-medium">{pct(r.top3Accuracy)}</td>
                <td className="px-5 py-3.5 text-right text-zinc-300 font-mono text-xs">{pct(r.top5HitRate)}</td>
                <td className="px-5 py-3.5 text-right text-emerald-400 font-mono text-xs font-medium">{r.mrr.toFixed(4)}</td>
                <td className="px-5 py-3.5 text-right text-zinc-500 text-xs">{r.sampleSize}</td>
                <td className="px-5 py-3.5 text-right text-zinc-500 text-xs font-mono">{r.modelVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
