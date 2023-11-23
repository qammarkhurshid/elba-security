import { inngest, type FunctionHandler } from '@/app/api/inngest/client';
import { getOrganisationsToSyncUsers } from './data';

export const handler: FunctionHandler = async () => {
  const organisations = await getOrganisationsToSyncUsers();

  if (organisations.length > 0) {
    await inngest.send(
      organisations.map((organisation) => ({
        name: 'users/run-user-sync-jobs',
        data: { ...organisation, isFirstScan: false },
      }))
    );
  }

  return {
    organisations,
  };
};

export const scheduleUserSyncJobs = inngest.createFunction(
  { id: 'schedule-user-sync-jobs' },
  { cron: '* * * * *' },
  handler
);
