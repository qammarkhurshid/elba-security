import type { FunctionHandler } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';
import { inngest } from '@/common/clients/inngest';
import type { SyncJob } from '@/repositories/dropbox/types/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXUsers } from '@/repositories/dropbox/clients';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/create-shared-link-sync-jobs'>) => {
  const { organisationId, isFirstScan, syncStartedAt, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken } = organisation;

  const dbxUsers = new DBXUsers({
    accessToken,
  });

  const team = await step.run('run-fetch-users', async () => {
    return dbxUsers.fetchUsers(cursor);
  });

  if (!team) {
    throw new Error(`Team is undefined for the organisation ${organisationId}`);
  }

  const job: SyncJob = {
    organisationId,
    syncStartedAt,
    isFirstScan,
  };

  const sharedLinkJobs = team.members.flatMap(({ id: teamMemberId }) => {
    return [
      {
        ...job,
        teamMemberId,
        isPersonal: false,
      },
      {
        ...job,
        teamMemberId,
        isPersonal: true,
      },
    ];
  });

  if (team.members.length > 0) {
    const eventsToWait = sharedLinkJobs.map(
      async (sharedLinkJob) =>
        await step.waitForEvent(`wait-for-shared-links-to-be-fetched`, {
          event: 'data-protection/synchronize-shared-links.completed',
          timeout: '1 day',
          if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${sharedLinkJob.teamMemberId}' && async.data.isPersonal == ${sharedLinkJob.isPersonal}`,
        })
    );

    await step.sendEvent(
      'synchronize-shared-links',
      sharedLinkJobs.map((sharedLinkJob) => ({
        name: 'data-protection/synchronize-shared-links',
        data: sharedLinkJob,
      }))
    );

    await Promise.all(eventsToWait);
  }

  if (team.hasMore) {
    await step.sendEvent('create-shared-link-sync-jobs', {
      name: 'data-protection/create-shared-link-sync-jobs',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });

    return {
      success: true,
    };
  }

  // Once all the shared links are fetched, we can create path sync jobs for  all the users of organisation
  await step.sendEvent('create-folder-and-files-sync-jobs', {
    name: 'data-protection/create-folder-and-files-sync-jobs',
    data: {
      organisationId,
      syncStartedAt,
      isFirstScan,
    },
  });

  return {
    success: true,
  };
};

export const createSharedLinkSyncJobs = inngest.createFunction(
  {
    id: 'create-shared-link-sync-jobs',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/create-shared-link-sync-jobs' },
  handler
);
