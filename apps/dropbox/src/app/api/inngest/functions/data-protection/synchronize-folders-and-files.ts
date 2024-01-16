import { elbaAccess } from '@/common/clients/elba';
import type { FunctionHandler } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';
import { inngest } from '@/common/clients/inngest';
import { getSharedLinks } from './data';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXFiles } from '@/repositories/dropbox/clients';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/synchronize-folders-and-files'>) => {
  const { organisationId, teamMemberId, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error('Access token not found');
  }

  const { accessToken, adminTeamMemberId, pathRoot } = organisation;

  const dbx = new DBXFiles({
    accessToken,
    adminTeamMemberId,
    teamMemberId,
    pathRoot,
  });

  const elba = elbaAccess(organisationId);

  const result = await step.run('fetch-folders-and-files', async () => {
    return dbx.fetchFoldersAndFiles(cursor);
  });

  if (result.hasMore) {
    await step.sendEvent('synchronize-folders-and-files', {
      name: 'data-protection/synchronize-folders-and-files',
      data: { ...event.data, cursor: result.nextCursor },
    });
  }

  const pathLowers = result.foldersAndFiles.reduce((acc: string[], file) => {
    if (!file.path_lower) {
      return acc;
    }

    acc.push(file.path_lower);
    return acc;
  }, []);

  const sharedLinks = await getSharedLinks({
    organisationId,
    pathLowers,
  });

  const foldersAndFilesToAdd = await step.run(
    'fetch-metadata-members-and-map-details',
    async () => {
      return dbx.fetchMetadataMembersAndMapDetails({
        foldersAndFiles: result.foldersAndFiles,
        sharedLinks,
      });
    }
  );

  if (foldersAndFilesToAdd.length > 0) {
    await step.run('send-data-protection-to-elba', async () => {
      await elba.dataProtection.updateObjects({
        // TODO: fix this
        // @ts-expect-error -- should be fixed
        objects: foldersAndFilesToAdd,
      });
    });
  }

  return {
    success: true,
  };
};

export const synchronizeFoldersAndFiles = inngest.createFunction(
  {
    id: 'synchronize-folders-and-files',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-folders-and-files' },
  handler
);
