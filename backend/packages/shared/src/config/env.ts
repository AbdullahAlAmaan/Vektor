import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  KAFKA_BROKERS: z.string(),
  KAFKA_CLIENT_ID: z.string(),
  KAFKA_GROUP_ID_FEATURE: z.string(),
  KAFKA_GROUP_ID_RECOMMEND: z.string(),
  GITHUB_TOKEN: z.string(),
  GITHUB_REPO_OWNER: z.string(),
  GITHUB_REPO_NAME: z.string(),
  API_PORT: z.coerce.number().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  RECOMMENDATION_CACHE_TTL: z.coerce.number().default(3600),
  RECOMMENDATION_TOP_N: z.coerce.number().default(10),
  ML_SCORER_URL: z.string().url().default('http://localhost:8000'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
