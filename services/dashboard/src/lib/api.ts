const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const REPO_ID = 'cmn3m0ujj0000kitsyl4lasoq'; // expressjs/express

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
  breakdown: {
    domainMatch: number;
    labelAffinityMatch: number;
    recencyAlignment: number;
    freshnessBonus: number;
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

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`, { next: { revalidate: 30 } });
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
