import { inngest } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXUsers } from '@/repositories/dropbox/clients';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/create-folder-and-files-sync-jobs'>) => {
  const { organisationId, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken } = organisation;

  const dbxUsers = new DBXUsers({
    accessToken,
  });

  const team = await step.run('fetch-users', async () => {
    return dbxUsers.fetchUsers(cursor);
  });

  if (!team) {
    throw new Error(`Team is undefined for the organisation ${organisationId}`);
  }

  const fileSyncJobs = team.members.map(({ id: teamMemberId }) => {
    return {
      ...event.data,
      teamMemberId,
    };
  });

  if (team.members.length > 0) {
    await step.sendEvent(
      'synchronize-folders-and-files',
      fileSyncJobs.map((pathSyncJob) => ({
        name: 'data-protection/synchronize-folders-and-files',
        data: pathSyncJob,
      }))
    );
  }

  if (team.hasMore) {
    await step.sendEvent('create-folder-and-files-sync-jobs', {
      name: 'data-protection/create-folder-and-files-sync-jobs',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });
  }

  return {
    success: true,
  };
};

export const createPathSyncJobs = inngest.createFunction(
  {
    id: 'create-folder-and-files-sync-jobs',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/create-folder-and-files-sync-jobs' },
  handler
);
