import type { FunctionHandler } from '@/common/clients/inngest';
import { inngest } from '@/common/clients/inngest';
import { DBXFiles } from '@/repositories/dropbox/clients/dbx-files';
import { insertSharedLinks } from './data';
import { InputArgWithTrigger } from '@/common/clients/types';
import { getOrganisationAccessDetails } from '../common/data';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/synchronize-shared-links'>) => {
  const { organisationId, cursor, teamMemberId, isPersonal } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken, pathRoot } = organisation;

  const dbx = new DBXFiles({
    accessToken,
    teamMemberId,
    pathRoot,
  });

  const sharedLinks = await step.run('fetch-shared-links', async () => {
    return await dbx.fetchSharedLinks({
      isPersonal,
      cursor,
    });
  });

  if (!sharedLinks) {
    throw new Error(`SharedLinks is undefined for the organisation ${organisationId}`);
  }

  if (sharedLinks.links.length > 0) {
    await step.run('insert-shared-links', async () => {
      await insertSharedLinks(
        sharedLinks.links.map((link) => ({ ...link, organisationId, teamMemberId }))
      );
    });
  }

  if (sharedLinks?.hasMore) {
    await step.sendEvent('synchronize-shared-links', {
      name: 'data-protection/synchronize-shared-links',
      data: {
        ...event.data,
        cursor: sharedLinks.nextCursor!,
      },
    });

    return {
      success: true,
    };
  }

  await step.sendEvent(`wait-for-shared-links-to-be-fetched`, {
    name: 'data-protection/synchronize-shared-links.completed',
    data: {
      ...event.data,
    },
  });

  return {
    success: true,
  };
};

export const synchronizeSharedLinks = inngest.createFunction(
  {
    id: 'synchronize-shared-links',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-shared-links' },
  handler
);
