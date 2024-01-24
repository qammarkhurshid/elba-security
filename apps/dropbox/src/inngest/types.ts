import type { GetFunctionInput } from 'inngest';
import { inngest } from './client';

type RunRefreshTokensSchema = {
  organisationId: string;
};

type RunUserSyncJobsSchema = {
  organisationId: string;
  isFirstSync: boolean;
  cursor?: string;
  syncStartedAt: string;
};

type RunThirdPartyAppsSyncJobsSchema = {
  organisationId: string;
  isFirstSync: boolean;
  syncStartedAt: string;
  cursor?: string;
};

type StartThirdPartyAppsSyncSchema = {
  organisationId: string;
};

type RefreshThirdPartyAppsObjectSchema = {
  organisationId: string;
  userId: string;
  appId: string;
};

type DeleteThirdPArtyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

export type InngestEvents = {
  'dropbox/token.refresh.triggered': { data: RunRefreshTokensSchema };
  'dropbox/token.refresh.canceled': { data: RunRefreshTokensSchema };
  'dropbox/users.sync_page.triggered': { data: RunUserSyncJobsSchema };
  'dropbox/users.sync_page.triggered.completed': { data: RunUserSyncJobsSchema };
  'third-party-apps/run-sync-jobs': { data: RunThirdPartyAppsSyncJobsSchema };
  'third-party-apps/start-sync': { data: StartThirdPartyAppsSyncSchema };
  'third-party-apps/refresh-objects': { data: RefreshThirdPartyAppsObjectSchema };
  'third-party-apps/delete-object': { data: DeleteThirdPArtyAppsObject };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
