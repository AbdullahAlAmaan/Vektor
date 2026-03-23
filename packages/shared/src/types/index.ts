// Domain types mirroring Prisma models — used across all services

export interface Repository {
  id: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  language: string | null;
  lastIngestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contributor {
  id: string;
  githubUserId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Commit {
  id: string;
  sha: string;
  repoId: string;
  contributorId: string;
  message: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
  committedAt: Date;
  createdAt: Date;
}

export interface Issue {
  id: string;
  githubIssueId: number;
  repoId: string;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  assigneeId: string | null;
  number: number;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PullRequest {
  id: string;
  githubPrId: number;
  repoId: string;
  contributorId: string;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  filesChanged: string[];
  mergedAt: Date | null;
  githubCreatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributorFeatureProfile {
  id: string;
  contributorId: string;
  repoId: string;
  expertiseVector: Record<string, number>;
  labelAffinity: Record<string, number>;
  domainScores: Record<string, number>;
  recencyScore: number;
  contributionVolume: number;
  modelVersion: string;
  updatedAt: Date;
}

export interface IssueFeatureProfile {
  id: string;
  issueId: string;
  repoId: string;
  labelVector: Record<string, number>;
  domainTags: Record<string, number>;
  tfidfVector: Record<string, number> | null;
  complexityHint: string | null;
  updatedAt: Date;
}

export interface RankedIssue {
  issueId: string;
  score: number;
  breakdown: {
    domainMatch: number;
    labelAffinityMatch: number;
    recencyAlignment: number;
    freshnessBonous: number;
  };
}

export interface RecommendationSnapshot {
  id: string;
  contributorId: string;
  repoId: string;
  recommendedIssueIds: string[];
  scores: Record<string, number>;
  modelVersion: string;
  generatedAt: Date;
}

export interface EvaluationResult {
  id: string;
  repoId: string;
  runId: string;
  top1Accuracy: number;
  top3Accuracy: number;
  top5HitRate: number;
  mrr: number;
  sampleSize: number;
  modelVersion: string;
  runAt: Date;
}
