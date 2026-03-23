import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding test data...');

  const repo = await prisma.repository.upsert({
    where: { fullName: 'facebook/react' },
    update: {},
    create: {
      githubRepoId: 10270250,
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      defaultBranch: 'main',
      language: 'JavaScript',
    },
  });
  console.log(`[Seed] Repository: ${repo.fullName} (${repo.id})`);

  const contributor = await prisma.contributor.upsert({
    where: { githubUserId: 1234567 },
    update: {},
    create: {
      githubUserId: 1234567,
      username: 'test-contributor',
      displayName: 'Test Contributor',
      repos: { connect: { id: repo.id } },
    },
  });
  console.log(`[Seed] Contributor: ${contributor.username} (${contributor.id})`);

  console.log('[Seed] Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
