import type { GetFunctionInput } from 'inngest';
import { z } from 'zod';
import type { inngest } from './inngest';

const runRefreshTokensSchema = z.object({
  organisationId: z.string(),
});

const runUserSyncJobsSchema = z.object({
  organisationId: z.string(),
  isFirstScan: z.boolean().default(false),
  cursor: z.string().optional(),
  syncStartedAt: z.string(),
});

const createSharedLinkSyncJobsSchema = z.object({
  organisationId: z.string(),
  isFirstScan: z.boolean().default(false),
  syncStartedAt: z.string(),
  cursor: z.string().optional(),
});

const createFolderAndFilesSyncJobsSchema = z.object({
  organisationId: z.string(),
  syncStartedAt: z.string(),
  isFirstScan: z.boolean().default(false),
  cursor: z.string().optional(),
});

const syncFilesAndFoldersSchema = z.object({
  organisationId: z.string(),
  syncStartedAt: z.string(),
  isFirstScan: z.boolean().default(false),
  teamMemberId: z.string(),
  cursor: z.string().optional(),
});

export const synchronizeSharedLinks = z.object({
  organisationId: z.string(),
  syncStartedAt: z.string(),
  isFirstScan: z.boolean().default(false),
  teamMemberId: z.string(),
  cursor: z.string().optional(),
  isPersonal: z.boolean(),
});

export const zodEventSchemas = {
  'tokens/run-refresh-token': { data: runRefreshTokensSchema },
  'users/run-user-sync-jobs': { data: runUserSyncJobsSchema },
  'users/run-user-sync-jobs.completed': { data: runUserSyncJobsSchema },
  'data-protection/create-shared-link-sync-jobs': { data: createSharedLinkSyncJobsSchema },
  'data-protection/synchronize-shared-links': { data: synchronizeSharedLinks },
  'data-protection/synchronize-shared-links.completed': {
    data: synchronizeSharedLinks,
  },
  'data-protection/create-folder-and-files-sync-jobs': { data: createFolderAndFilesSyncJobsSchema },
  'data-protection/synchronize-folders-and-files': { data: syncFilesAndFoldersSchema },
};

export type InputArgWithTrigger<T extends keyof typeof zodEventSchemas> = GetFunctionInput<
  typeof inngest,
  T
>;
