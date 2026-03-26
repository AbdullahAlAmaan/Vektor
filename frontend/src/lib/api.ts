const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface Repo {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  language: string | null;
  lastIngestedAt: string | null;
}

export interface ContributorSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  featureProfiles: FeatureProfile[];
}

export interface FeatureProfile {
  id: string;
  contributorId: string;
  repoId: string;
  expertiseVector: Record<string, number>;
  labelAffinity: Record<string, number>;
  domainScores: Record<string, number>;
  recencyScore: number;
  contributionVolume: number;
  modelVersion: string;
}

export interface RankedIssue {
  issueId: string;
  score: number;
  complexityHint?: string | null;
  issueTitle?: string | null;
  issueNumber?: number | null;
  issueLabels?: string[];
  breakdown: {
    domainMatch: number;
    labelAffinityMatch: number;
    textSimilarity: number;
    recencyAlignment: number;
    freshnessBonus: number;
    workloadPenalty: number;
  };
}

export interface RankedContributor {
  contributorId: string;
  score: number;
  breakdown: {
    domainMatch: number;
    labelAffinityMatch: number;
    textSimilarity: number;
    recencyAlignment: number;
    freshnessBonous: number;
    workloadPenalty: number;
  };
}

export interface HealthStatus {
  status: string;
  checks: Record<string, string>;
}

export interface EvaluationResult {
  id: string;
  runAt: string;
  top1Accuracy: number;
  top3Accuracy: number;
  top5HitRate: number;
  mrr: number;
  sampleSize: number;
  modelVersion: string;
  repoId: string;
}

export interface IngestionJob {
  status: 'running' | 'done' | 'error';
  owner: string;
  name: string;
  repoId?: string;
  step?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  contributors?: number;
  commits?: number;
  issues?: number;
  prs?: number;
}

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`, { next: { revalidate: 30 } });
  return res.json();
}

export async function getRepos(): Promise<Repo[]> {
  const res = await fetch(`${API_BASE}/repos`, { next: { revalidate: 10 } });
  if (!res.ok) return [];
  return res.json();
}

export async function getRepoContributors(repoId: string): Promise<ContributorSummary[]> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/contributors`, { next: { revalidate: 60 } });
  return res.json();
}

export async function getContributorProfile(id: string): Promise<ContributorSummary> {
  const res = await fetch(`${API_BASE}/contributors/${id}/profile`, { next: { revalidate: 60 } });
  return res.json();
}

export async function getRecommendations(contributorId: string, repoId: string, limit = 10): Promise<RankedIssue[]> {
  const res = await fetch(
    `${API_BASE}/contributors/${contributorId}/recommendations?repoId=${repoId}&limit=${limit}`,
    { next: { revalidate: 60 } }
  );
  return res.json();
}

export async function getEvaluationResults(): Promise<EvaluationResult[]> {
  const res = await fetch(`${API_BASE}/evaluation/results`, { cache: 'no-store' });
  return res.json();
}

export async function ingestRepo(url: string): Promise<{ jobId: string; owner: string; name: string }> {
  const res = await fetch(`${API_BASE}/repos/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to start ingestion');
  }
  return res.json();
}

export async function getIngestionStatus(jobId: string): Promise<IngestionJob> {
  const res = await fetch(`${API_BASE}/repos/jobs/${jobId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}
