import { serve } from 'inngest/next';
import { inngest } from '@/app/api/inngest/client';
import { runTokenRefresh } from './functions/tokens/run-token-refresh';
import { scheduleTokenRefreshJob } from './functions/tokens/schedule-tokens-refresh-job';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleTokenRefreshJob, runTokenRefresh],
});
