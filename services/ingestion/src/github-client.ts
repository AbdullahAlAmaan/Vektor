import { Octokit } from '@octokit/rest';
import { env } from '@vektor/shared';

export function createGitHubClient(): Octokit {
  return new Octokit({
    auth: env.GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter: number, options: { method: string; url: string }) => {
        console.warn(`[GitHub] Rate limit hit for ${options.method} ${options.url}. Retrying after ${retryAfter}s.`);
        return true;
      },
      onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }) => {
        console.warn(`[GitHub] Secondary rate limit hit for ${options.method} ${options.url}.`);
        return retryAfter < 60;
      },
    },
  });
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
