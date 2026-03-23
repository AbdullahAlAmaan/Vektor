-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubRepoId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastIngestedAt" TIMESTAMP(3),

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "githubUserId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "filesChanged" TEXT[],
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "githubIssueId" INTEGER NOT NULL,
    "repoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" TEXT NOT NULL DEFAULT 'open',
    "labels" TEXT[],
    "assigneeId" TEXT,
    "number" INTEGER NOT NULL,
    "githubCreatedAt" TIMESTAMP(3) NOT NULL,
    "githubUpdatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "githubPrId" INTEGER NOT NULL,
    "repoId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" TEXT NOT NULL,
    "labels" TEXT[],
    "filesChanged" TEXT[],
    "mergedAt" TIMESTAMP(3),
    "githubCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributorFeatureProfile" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "expertiseVector" JSONB NOT NULL,
    "labelAffinity" JSONB NOT NULL,
    "domainScores" JSONB NOT NULL,
    "recencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionVolume" INTEGER NOT NULL DEFAULT 0,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorFeatureProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueFeatureProfile" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "labelVector" JSONB NOT NULL,
    "domainTags" JSONB NOT NULL,
    "tfidfVector" JSONB,
    "complexityHint" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueFeatureProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "recommendedIssueIds" TEXT[],
    "scores" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "top1Accuracy" DOUBLE PRECISION NOT NULL,
    "top3Accuracy" DOUBLE PRECISION NOT NULL,
    "top5HitRate" DOUBLE PRECISION NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContributorToRepository" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubRepoId_key" ON "Repository"("githubRepoId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_githubUserId_key" ON "Contributor"("githubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_username_key" ON "Contributor"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_sha_key" ON "Commit"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_githubIssueId_repoId_key" ON "Issue"("githubIssueId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_githubPrId_repoId_key" ON "PullRequest"("githubPrId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "ContributorFeatureProfile_contributorId_repoId_key" ON "ContributorFeatureProfile"("contributorId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueFeatureProfile_issueId_key" ON "IssueFeatureProfile"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "_ContributorToRepository_AB_unique" ON "_ContributorToRepository"("A", "B");

-- CreateIndex
CREATE INDEX "_ContributorToRepository_B_index" ON "_ContributorToRepository"("B");

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Contributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorFeatureProfile" ADD CONSTRAINT "ContributorFeatureProfile_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueFeatureProfile" ADD CONSTRAINT "IssueFeatureProfile_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSnapshot" ADD CONSTRAINT "RecommendationSnapshot_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContributorToRepository" ADD CONSTRAINT "_ContributorToRepository_A_fkey" FOREIGN KEY ("A") REFERENCES "Contributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContributorToRepository" ADD CONSTRAINT "_ContributorToRepository_B_fkey" FOREIGN KEY ("B") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
