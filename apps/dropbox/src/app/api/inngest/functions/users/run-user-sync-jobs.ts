import { inngest } from '@/app/api/inngest/client';
import { syncOrganisationUsers } from './service';

export const runUserSyncJobs = inngest.createFunction(
  { id: 'run-user-sync-jobs' },
  { event: 'users/run-user-sync-jobs' },
  async ({ event, step }) => {
    console.log('run-user-sync-jobs');
    return await syncOrganisationUsers(event);
  }
);
