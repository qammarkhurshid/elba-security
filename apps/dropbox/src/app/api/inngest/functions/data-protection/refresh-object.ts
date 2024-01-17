import type { FunctionHandler } from '@/common/clients/inngest';
import { inngest } from '@/common/clients/inngest';
import { InputArgWithTrigger } from '@/common/clients/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXFiles } from '@/repositories/dropbox/clients';
import { elbaAccess } from '@/common/clients/elba';
import { FileAndFolderType } from '@/repositories/dropbox/types/types';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/refresh-object'>) => {
  const {
    id: sourceObjectId,
    organisationId,
    metadata: { ownerId, type, isPersonal },
  } = event.data;

  const isFile = type === 'file';
  const path = isFile ? sourceObjectId : `ns:${sourceObjectId}`;

  if (!ownerId) {
    throw new Error('Cannot refresh a Dropbox object without an owner');
  }

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken, adminTeamMemberId, pathRoot } = organisation;

  const dbx = new DBXFiles({
    accessToken,
    teamMemberId: ownerId,
    adminTeamMemberId,
    pathRoot,
  });

  const elba = elbaAccess(organisationId);

  step.run('fetch-object', async () => {
    const fileMetadata = (await dbx.fetchFolderOrFileMetadataByPath({
      isPersonal,
      path,
    })) as FileAndFolderType;

    if (!fileMetadata.path_lower) {
      return await elba.dataProtection.deleteObjects({
        ids: [sourceObjectId],
      });
    }

    const sharedLinks = await dbx.fetchSharedLinksByPath({
      isPersonal,
      path,
    });

    const folderOrFileToAdd = await dbx.fetchMetadataMembersAndMapDetails({
      foldersAndFiles: [fileMetadata],
      sharedLinks,
    });

    await elba.dataProtection.updateObjects({
      //@ts-expect-error -- TODO: fix the type error
      objects: folderOrFileToAdd,
    });
  });

  return {
    success: true,
  };
};

export const refreshObject = inngest.createFunction(
  {
    id: 'refresh-object',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/refresh-object' },
  handler
);
