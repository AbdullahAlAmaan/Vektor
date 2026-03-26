"use client";

import { Badge } from "@/components/ui/badge";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, GitBranch, GitCommit, Tag, Clock, ExternalLink } from "lucide-react";
import type { ContributorSummary, RankedIssue, Repo } from "@/lib/api";

const listVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const COMPLEXITY_COLORS: Record<string, string> = {
  easy:   'bg-emerald-500/10 text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-400',
  hard:   'bg-red-500/10 text-red-400',
};

const DOMAIN_COLORS: Record<string, string> = {
  backend: '#6366f1', frontend: '#a855f7', testing: '#10b981',
  auth: '#f59e0b', database: '#f97316', ci: '#ec4899', docs: '#06b6d4',
};

interface Props {
  contributor: ContributorSummary;
  recommendations: RankedIssue[];
  repo?: Repo;
}

export function ContributorProfileBlock({ contributor, recommendations, repo }: Props) {
  const profile = contributor.featureProfiles?.[0];
  const domainScores = (profile?.domainScores ?? {}) as Record<string, number>;
  const labelAffinity = (profile?.labelAffinity ?? {}) as Record<string, number>;
  const vol = profile?.contributionVolume ?? 0;
  const recency = profile?.recencyScore ?? 0;

  const topDomains = Object.entries(domainScores)
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topLabels = Object.entries(labelAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const highlights = [
    {
      title: "Domains",
      description: topDomains.length > 0
        ? topDomains.map(([d, s]) => `${d} (${(s * 100).toFixed(0)}%)`).join(", ")
        : "No domain pattern matches yet — re-ingest to populate.",
    },
    {
      title: "Label Affinity",
      description: topLabels.length > 0
        ? topLabels.map(([l]) => l).join(", ")
        : "No label history in this repo.",
    },
    {
      title: "Activity",
      description: `${vol.toLocaleString()} contributions tracked · recency score ${recency.toFixed(3)}`,
    },
  ];

  const topIssues = recommendations.slice(0, 4);

  return (
    <section className="relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-zinc-950/45 p-8 backdrop-blur-2xl md:p-12"
      >
        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="relative grid gap-12 lg:grid-cols-2">
          {/* Left — highlights */}
          <div className="space-y-8">
            <Badge
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-zinc-700 bg-zinc-900/55 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-zinc-400 backdrop-blur"
            >
              Contributor
            </Badge>

            <div className="space-y-4">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                {contributor.displayName || contributor.username}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-xl text-sm leading-relaxed text-zinc-500"
              >
                @{contributor.username} · {repo?.fullName ?? "GitHub contributor"}
              </motion.p>
            </div>

            {/* Highlights */}
            <div className="grid gap-4">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-5 backdrop-blur transition-all hover:border-zinc-700/60 hover:shadow-lg"
                >
                  <div className="relative space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">{item.title}</p>
                    <p className="text-sm leading-relaxed text-zinc-400">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View on GitHub */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a
                href={`https://github.com/${contributor.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all hover:shadow-lg"
              >
                <GitBranch className="h-4 w-4" />
                View on GitHub
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>

          {/* Right — profile card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent blur-3xl" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-zinc-800/50 bg-zinc-900/60 p-8 backdrop-blur-xl">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative mb-5"
                >
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-2xl" />
                  {contributor.avatarUrl ? (
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.username}
                      className="relative h-24 w-24 rounded-full border border-zinc-700 object-cover shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
                    />
                  ) : (
                    <div className="relative h-24 w-24 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-400">
                      {contributor.username[0].toUpperCase()}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-1"
                >
                  <h3 className="text-xl font-semibold tracking-tight text-white">{contributor.username}</h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-600">
                    {topDomains[0]?.[0] ?? "contributor"}
                  </p>
                </motion.div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mt-4 flex gap-6 text-center"
                >
                  <div>
                    <div className="flex items-center gap-1 text-zinc-600 justify-center mb-1">
                      <GitCommit className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">{vol.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">contributions</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-zinc-600 justify-center mb-1">
                      <Clock className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">{recency.toFixed(3)}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">recency</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-zinc-600 justify-center mb-1">
                      <Tag className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">{topLabels.length}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">labels</p>
                  </div>
                </motion.div>
              </div>

              {/* Top recommended issues */}
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-600 mb-3">
                  Top Recommendations
                </p>
                {topIssues.length > 0 ? (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-2"
                  >
                    {topIssues.map((issue) => {
                      const complexity = (issue as { complexityHint?: string }).complexityHint;
                      const ghUrl = issue.issueNumber && repo
                        ? `https://github.com/${repo.fullName}/issues/${issue.issueNumber}`
                        : null;
                      return (
                        <motion.a
                          key={issue.issueId}
                          variants={itemVariants}
                          href={ghUrl ?? '#'}
                          target={ghUrl ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-900/70 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-zinc-700/60 hover:shadow-md"
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-300 truncate">
                                {issue.issueTitle
                                  ? <>
                                      {issue.issueNumber && <span className="text-zinc-600 mr-1">#{issue.issueNumber}</span>}
                                      {issue.issueTitle}
                                    </>
                                  : <span className="font-mono text-zinc-600">{issue.issueId.slice(0, 12)}…</span>
                                }
                              </p>
                            </div>
                            {complexity && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${COMPLEXITY_COLORS[complexity] ?? 'bg-zinc-800 text-zinc-500'}`}>
                                {complexity}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-xs font-mono text-indigo-400">{issue.score.toFixed(2)}</span>
                            <ExternalLink className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.a>
                      );
                    })}
                  </motion.div>
                ) : (
                  <p className="text-xs text-zinc-700">No open issues to recommend.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
