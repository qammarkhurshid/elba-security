import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = createEnv({
  server: {
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_SOURCE_ID: z.string().min(1),
    // POSTGRES_HOST: z.string(),
    // POSTGRES_PORT: zEnvInt(),
    // POSTGRES_USER: z.string(),
    // POSTGRES_PASSWORD: z.string(),
    // POSTGRES_DATABASE: z.string(),
    POSTGRES_URL: z.string().min(1),
    SLACK_CLIENT_ID: z.string().min(1),
    SLACK_CLIENT_SECRET: z.string().min(1),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_APP_LEVEL_TOKEN: z.string().min(1),
    REMOVE_ME_WEBHOOK_LOG_FILE: z.string().min(1),
    // REMOVE_ME_SLACK_OAUTH_TOKEN: z.string(),
    // REMOVE_ME_ELBA_ORGANISATION_ID: z.string(),
  },
  experimental__runtimeEnv: {},
});

// export const dbEnv = createEnv({
//   server: {
//     ...dbVariables,
//   },
//   experimental__runtimeEnv: {},
// });
