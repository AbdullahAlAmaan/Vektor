'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Plus, Search, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, Trophy, Users, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContributorSummary, Repo, RankedIssue } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const COMPLEXITY_STYLES = {
  easy: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
} as const;

const DOMAIN_COLORS: Record<string, string> = {
  backend: 'bg-blue-500/10 text-blue-400',
  frontend: 'bg-violet-500/10 text-violet-400',
  testing: 'bg-emerald-500/10 text-emerald-400',
  auth: 'bg-yellow-500/10 text-yellow-400',
  database: 'bg-orange-500/10 text-orange-400',
  ci: 'bg-pink-500/10 text-pink-400',
  docs: 'bg-cyan-500/10 text-cyan-400',
};

type Phase = 'setup' | 'loading' | 'results';

interface MemberResult {
  username: string;
  contributor: ContributorSummary | null;
  recommendations: RankedIssue[];
  error?: string;
}

// ── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPanel({
  repos,
  selectedRepoId,
  onRepoChange,
  members,
  onAddMember,
  onRemoveMember,
  onAnalyze,
}: {
  repos: Repo[];
  selectedRepoId: string;
  onRepoChange: (id: string) => void;
  members: string[];
  onAddMember: (u: string) => void;
  onRemoveMember: (u: string) => void;
  onAnalyze: () => void;
}) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !members.includes(trimmed)) {
      onAddMember(trimmed);
    }
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto space-y-6"
    >
      {/* Repo selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Repository</label>
        <select
          value={selectedRepoId}
          onChange={(e) => onRepoChange(e.target.value)}
          className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700 text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        >
          {repos.length === 0 && <option value="">No repos — add one first</option>}
          {repos.map((r) => (
            <option key={r.id} value={r.id}>{r.fullName}</option>
          ))}
        </select>
      </div>

      {/* Member input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Team Members (GitHub usernames)</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="github-username"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Member tags */}
        <AnimatePresence>
          {members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap gap-2 pt-1"
            >
              {members.map((m) => (
                <motion.span
                  key={m}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm"
                >
                  {m}
                  <button
                    onClick={() => onRemoveMember(m)}
                    className="rounded-full p-0.5 hover:bg-indigo-500/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={members.length === 0 || !selectedRepoId}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] active:scale-[0.98]"
      >
        <Zap className="h-4 w-4" />
        Analyze Team
        <ChevronRight className="h-4 w-4" />
      </button>

      <p className="text-xs text-zinc-600 text-center">
        Add GitHub usernames of your team members. Vektor will match them to contributors in the selected repo and show personalized issue recommendations.
      </p>
    </motion.div>
  );
}

// ── Loading Phase ─────────────────────────────────────────────────────────────

function LoadingPanel({ members }: { members: string[] }) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-6"
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-indigo-500/20" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500"
        />
        <Zap className="absolute inset-0 m-auto h-6 w-6 text-indigo-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-medium">Analyzing expertise vectors</p>
        <p className="text-zinc-500 text-sm">Matching {members.length} member{members.length !== 1 ? 's' : ''} to open issues…</p>
      </div>
      <div className="flex flex-col gap-2 w-64">
        {members.map((m, i) => (
          <motion.div
            key={m}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center gap-2 text-sm text-zinc-500"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 flex-shrink-0" />
            <span className="font-mono">{m}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Results Phase ─────────────────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="relative h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
      />
    </div>
  );
}

function IssueRow({ issue, repoFullName, rank }: { issue: RankedIssue; repoFullName: string; rank: number }) {
  const [owner, name] = repoFullName.split('/');
  const ghUrl = issue.issueNumber
    ? `https://github.com/${owner}/${name}/issues/${issue.issueNumber}`
    : null;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0 group">
      <span className="text-xs font-mono text-zinc-700 w-4 flex-shrink-0 pt-0.5">{rank}</span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          {issue.issueTitle ? (
            <a
              href={ghUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-sm text-zinc-200 group-hover:text-white transition-colors truncate flex-1',
                ghUrl ? 'hover:underline cursor-pointer' : 'cursor-default'
              )}
            >
              {issue.issueNumber && <span className="text-zinc-600 font-mono mr-1">#{issue.issueNumber}</span>}
              {issue.issueTitle}
            </a>
          ) : (
            <span className="text-sm text-zinc-500 font-mono flex-1 truncate">{issue.issueId.slice(0, 16)}…</span>
          )}
          {issue.complexityHint && (
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0', COMPLEXITY_STYLES[issue.complexityHint as keyof typeof COMPLEXITY_STYLES] ?? 'bg-zinc-800 text-zinc-400')}>
              {issue.complexityHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ScoreBar value={issue.score} />
          <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0 w-8 text-right">{(issue.score * 100).toFixed(0)}%</span>
        </div>
        {issue.issueLabels && issue.issueLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issue.issueLabels.slice(0, 3).map((l) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{l}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberCard({
  result,
  index,
  repoFullName,
}: {
  result: MemberResult;
  index: number;
  repoFullName: string;
}) {
  const profile = result.contributor?.featureProfiles[0];
  const domains = (profile?.domainScores as Record<string, number> | undefined) ?? {};
  const topDomains = Object.entries(domains)
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
        {result.contributor?.avatarUrl ? (
          <img
            src={result.contributor.avatarUrl}
            alt={result.username}
            className="h-9 w-9 rounded-full ring-2 ring-zinc-700 flex-shrink-0"
          />
        ) : (
          <div className="h-9 w-9 rounded-full ring-2 ring-zinc-700 bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 flex-shrink-0">
            {result.username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm truncate">{result.username}</span>
            {result.contributor ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            )}
          </div>
          {result.contributor ? (
            <p className="text-xs text-zinc-500">
              {profile?.contributionVolume ?? 0} contributions · recency {(profile?.recencyScore ?? 0).toFixed(3)}
            </p>
          ) : (
            <p className="text-xs text-amber-500/80">Not found in this repo</p>
          )}
        </div>
      </div>

      {/* Domain pills */}
      {topDomains.length > 0 && (
        <div className="px-5 py-2.5 border-b border-zinc-800/60 flex flex-wrap gap-1.5">
          {topDomains.map(([domain, score]) => (
            <span
              key={domain}
              className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', DOMAIN_COLORS[domain] ?? 'bg-zinc-800 text-zinc-400')}
            >
              {domain} {(score * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}

      {/* Issue recommendations */}
      <div className="px-5 py-1">
        {!result.contributor ? (
          <div className="py-6 text-center text-zinc-600 text-xs">
            No contribution history in this repo
          </div>
        ) : result.recommendations.length === 0 ? (
          <div className="py-6 text-center text-zinc-600 text-xs">
            No open issues to recommend
          </div>
        ) : (
          result.recommendations.slice(0, 5).map((issue, i) => (
            <IssueRow key={issue.issueId} issue={issue} repoFullName={repoFullName} rank={i + 1} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function ResultsPanel({
  results,
  repoFullName,
  onReset,
}: {
  results: MemberResult[];
  repoFullName: string;
  onReset: () => void;
}) {
  const found = results.filter((r) => r.contributor !== null).length;

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="h-4 w-4" />
            <span><span className="text-white font-semibold">{found}</span> / {results.length} matched</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <GitBranch className="h-4 w-4" />
            <span className="text-zinc-500">{repoFullName}</span>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {results.map((r, i) => (
          <MemberCard key={r.username} result={r} index={i} repoFullName={repoFullName} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HackathonPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoaded, setReposLoaded] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [results, setResults] = useState<MemberResult[]>([]);

  // Load repos on mount
  React.useEffect(() => {
    fetch(`${API_BASE}/repos`)
      .then((r) => r.json())
      .then((data: Repo[]) => {
        setRepos(data);
        if (data.length > 0) setSelectedRepoId(data[0].id);
        setReposLoaded(true);
      })
      .catch(() => setReposLoaded(true));
  }, []);

  const analyze = useCallback(async () => {
    if (!selectedRepoId || members.length === 0) return;
    setPhase('loading');

    try {
      // Fetch all contributors for the selected repo
      const allContributors: ContributorSummary[] = await fetch(
        `${API_BASE}/repos/${selectedRepoId}/contributors`
      ).then((r) => r.json());

      // Match members to contributors by username
      const memberResults: MemberResult[] = await Promise.all(
        members.map(async (username) => {
          const contributor = allContributors.find(
            (c) => c.username.toLowerCase() === username.toLowerCase()
          ) ?? null;

          if (!contributor) {
            return { username, contributor: null, recommendations: [] };
          }

          try {
            const recommendations: RankedIssue[] = await fetch(
              `${API_BASE}/contributors/${contributor.id}/recommendations?repoId=${selectedRepoId}&limit=5`
            ).then((r) => r.json());
            return { username, contributor, recommendations };
          } catch {
            return { username, contributor, recommendations: [], error: 'Failed to fetch recommendations' };
          }
        })
      );

      setResults(memberResults);
      setPhase('results');
    } catch {
      setPhase('setup');
    }
  }, [selectedRepoId, members]);

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <div className="relative space-y-8">
      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg bg-amber-500/10 p-2.5 ring-1 ring-amber-500/20">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hackathon Mode</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Add your team — Vektor matches members to the best open issues based on their GitHub history
            </p>
          </div>
        </div>
      </div>

      {/* How it works — only on setup */}
      {phase === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 max-w-xl mx-auto"
        >
          {[
            { icon: GitBranch, label: '1. Pick repo', desc: 'Select your hackathon repository' },
            { icon: Users, label: '2. Add team', desc: 'Enter GitHub usernames' },
            { icon: Trophy, label: '3. Get matches', desc: 'AI-ranked issue assignments' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center space-y-1">
              <Icon className="h-4 w-4 text-zinc-400 mx-auto" />
              <p className="text-xs font-medium text-zinc-300">{label}</p>
              <p className="text-[11px] text-zinc-600">{desc}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Phase panels */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'setup' && reposLoaded && (
            <SetupPanel
              key="setup"
              repos={repos}
              selectedRepoId={selectedRepoId}
              onRepoChange={setSelectedRepoId}
              members={members}
              onAddMember={(u) => setMembers((prev) => [...prev, u])}
              onRemoveMember={(u) => setMembers((prev) => prev.filter((m) => m !== u))}
              onAnalyze={analyze}
            />
          )}
          {phase === 'loading' && <LoadingPanel key="loading" members={members} />}
          {phase === 'results' && (
            <ResultsPanel
              key="results"
              results={results}
              repoFullName={selectedRepo?.fullName ?? ''}
              onReset={() => setPhase('setup')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
