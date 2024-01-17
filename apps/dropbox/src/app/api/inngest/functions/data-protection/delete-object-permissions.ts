import type { FunctionHandler } from '@/common/clients/inngest';
import { inngest } from '@/common/clients/inngest';
import { InputArgWithTrigger } from '@/common/clients/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXPermissions } from '@/repositories/dropbox/clients/dbx-permissions';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/delete-object-permissions'>) => {
  const { organisationId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken, adminTeamMemberId } = organisation;

  const dbx = new DBXPermissions({
    accessToken,
    adminTeamMemberId,
  });

  await step.run('fetch-shared-links', async () => {
    return await dbx.removePermissions(event.data);
  });

  return {
    success: true,
  };
};

export const deleteObjectPermissions = inngest.createFunction(
  {
    id: 'delete-object-permissions',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/delete-object-permissions' },
  handler
);
