import { serve } from 'inngest/next';
import { inngest } from '@/app/api/inngest/client';
import { runTokenRefresh } from './functions/tokens/run-refresh-tokens';
import { scheduleTokenRefreshJob } from './functions/tokens/schedule-refresh-tokens-jobs';
import { scheduleUserSyncJobs } from './functions/users/schedule-user-sync-jobs';
import { runUserSyncJobs } from './functions/users/run-user-sync-jobs';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleTokenRefreshJob, runTokenRefresh, scheduleUserSyncJobs, runUserSyncJobs],
});
