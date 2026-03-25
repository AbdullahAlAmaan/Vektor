import { env } from '@vektor/shared';

interface BatchScoringResponse {
  similarities: number[];
}

/**
 * Call the Python FastAPI ml-scorer service to compute TF-IDF similarities
 * between a contributor's commit corpus and a list of issue texts.
 *
 * Falls back to all-zeros on any network or parse error — a dead ML service
 * must never crash the recommendation engine.
 */
export async function batchTfidfSimilarity(
  contributorText: string,
  issueTexts: string[],
): Promise<number[]> {
  if (issueTexts.length === 0) return [];

  try {
    const response = await fetch(`${env.ML_SCORER_URL}/score/tfidf/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributor_text: contributorText, issue_texts: issueTexts }),
      signal: AbortSignal.timeout(5000), // 5 s hard timeout
    });

    if (!response.ok) {
      console.warn(`[ml-client] ML scorer returned ${response.status} — falling back to 0`);
      return new Array(issueTexts.length).fill(0);
    }

    const data = (await response.json()) as BatchScoringResponse;
    return data.similarities;
  } catch (err) {
    console.warn('[ml-client] ML scorer unreachable, text similarity set to 0:', (err as Error).message);
    return new Array(issueTexts.length).fill(0);
  }
}

/**
 * Build a contributor's text corpus from their recent commit messages in a repo.
 * Caps at 200 messages to keep the TF-IDF request size reasonable.
 */
export function buildContributorText(commitMessages: string[]): string {
  return commitMessages.slice(0, 200).join(' ');
}

/**
 * Build the searchable text for an issue.
 */
export function buildIssueText(title: string, body: string | null): string {
  return body ? `${title} ${body}` : title;
}
