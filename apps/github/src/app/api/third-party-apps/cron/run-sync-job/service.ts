/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { RequestError } from '@octokit/request-error';
import type { OrganizationInstallation } from '@/repositories/github/organization';
import { getPaginatedOrganizationInstallations } from '@/repositories/github/organization';
import type { App } from '@/repositories/github/app';
import { getApp } from '@/repositories/github/app';
import type { ThirdPartyAppsObject } from '@/repositories/elba/resources/third-party-apps/types';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import { env } from '@/common/env';
import {
  updateThirdPartyAppsSyncJobCursor,
  type ThirdPartyAppsSyncJob,
  deleteThirdPartyAppsSyncJob,
  getThirdPartyAppsSyncJob,
  updateThirdPartyAppsSyncJobRetryAfter,
  updateThirdPartyAppsSyncJobRetryCount,
} from './data';

const formatElbaAppScopes = (installationPermissions: OrganizationInstallation['permissions']) =>
  Object.entries(installationPermissions).map(([key, value]) => [key, value].join(':'));

const formatElbaApp = (
  app: App,
  installation: OrganizationInstallation,
  adminIds: string[]
): ThirdPartyAppsObject => {
  const scopes = formatElbaAppScopes(installation.permissions);
  return {
    id: `${installation.id}`,
    url: app.html_url,
    name: app.name,
    publisherName: app.owner?.name ?? undefined,
    description: app.description ?? undefined,
    users: adminIds.map((id) => ({
      id,
      scopes,
      createdAt: new Date(installation.created_at),
    })),
  };
};

const runThirdPartyAppsSyncJob = async (job: ThirdPartyAppsSyncJob) => {
  const elba = new ElbaRepository(job.installation.elbaOrganizationId);
  let cursor = job.cursor;

  do {
    // TODO: add log for invalidInstallations
    const { nextCursor, validInstallations } = await getPaginatedOrganizationInstallations(
      job.installationId,
      job.installation.accountLogin,
      cursor
    );
    cursor = nextCursor;

    const elbaApps = await Promise.all(
      validInstallations
        .filter((installation) => installation.suspended_at === null)
        .map(async (installation) => {
          const app = await getApp(job.installationId, installation.app_slug);
          return formatElbaApp(app, installation, job.adminIds);
        })
    );

    await elba.thridPartyApps.updateObjects(elbaApps);

    if (cursor) {
      await updateThirdPartyAppsSyncJobCursor(job.installationId, cursor);
    }
  } while (cursor);

  await elba.thridPartyApps.deleteObjects(job.syncStartedAt);
  await deleteThirdPartyAppsSyncJob(job.installationId);
};

export const runThirdPartyAppsSyncJobs = async () => {
  const job = await getThirdPartyAppsSyncJob();

  if (!job) {
    return {
      message: 'There is no third_party_apps_sync_job to run',
    };
  }

  try {
    await runThirdPartyAppsSyncJob(job);
    return { success: true, id: job.installationId };
  } catch (error) {
    if (
      error instanceof RequestError &&
      error.response?.headers['x-ratelimit-remaining'] === '0' &&
      error.response.headers['x-ratelimit-reset']
    ) {
      const retryAfter = new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000);
      await updateThirdPartyAppsSyncJobRetryAfter(job.installationId, retryAfter);
    } else if (job.retryCount < env.THIRD_PARTY_APPS_MAX_RETRY) {
      await updateThirdPartyAppsSyncJobRetryCount(job.installationId, job.retryCount + 1);
    } else {
      await deleteThirdPartyAppsSyncJob(job.installationId);
    }
    return { success: false, id: job.installationId };
  }
};
