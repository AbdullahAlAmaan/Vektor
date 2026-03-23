import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl: string | null;
  contributions: number;
  recencyScore: number;
}

interface LeaderboardProps {
  contributors: LeaderboardEntry[];
}

export function Leaderboard({ contributors }: LeaderboardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white">Top Contributors</h3>
        <Link href="/contributors" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View all →
        </Link>
      </div>
      <div className="space-y-4">
        {contributors.map((c, i) => (
          <Link
            key={c.id}
            href={`/contributors/${c.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
              {i + 1}
            </div>
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-700 group-hover:ring-blue-500/50 transition-all">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-bold text-zinc-400">
                  {c.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                  {c.username}
                </p>
                <span className="text-xs font-semibold text-zinc-400 ml-2 flex-shrink-0">
                  {c.contributions}
                </span>
              </div>
              <div className="mt-1.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{ width: `${Math.min(c.recencyScore * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
