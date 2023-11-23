import { inngest } from '@/app/api/inngest/client';
import { handler } from './service';

export const runUserSyncJobs = inngest.createFunction(
  {
    id: 'run-user-sync-jobs',
    retries: 6,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  { event: 'users/run-user-sync-jobs' },
  handler
);
