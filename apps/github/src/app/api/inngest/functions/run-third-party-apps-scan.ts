/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { Elba, type ThirdPartyAppsObject } from '@elba-security/sdk';
import type { OrganizationInstallation } from '@/repositories/github/organization';
import { getPaginatedOrganizationInstallations } from '@/repositories/github/organization';
import type { App } from '@/repositories/github/app';
import { getApp } from '@/repositories/github/app';
import { env } from '@/env';
import { inngest } from '../client';
import { getInstallation, getInstallationAdminsIds } from './data';
import { handleError } from './utils';

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
      createdAt: installation.created_at,
    })),
  };
};
export const runThirdPartyAppsScan = inngest.createFunction(
  {
    id: 'run-third-party-apps-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.THIRD_PARTY_APPS_MAX_RETRY,
    // idempotency: 'event.data.installationId',
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'third-party-apps/scan',
  },
  async ({ event, step }) => {
    if (!event.ts) {
      throw new Error('No timestamp');
    }
    const syncStartedAt = new Date(event.ts);
    const { installationId } = event.data;
    const [installation, adminsIds] = await step.run('initialize', () =>
      Promise.all([getInstallation(installationId), getInstallationAdminsIds(installationId)])
    );

    const elba = new Elba({
      organisationId: installation.elbaOrganizationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    let cursor: string | null = null;
    do {
      cursor = await step
        .run('paginate', async () => {
          // TODO: add log for invalidInstallations
          const { nextCursor, validInstallations } = await getPaginatedOrganizationInstallations(
            installationId,
            installation.accountLogin,
            cursor
          );

          const elbaApps = await Promise.all(
            validInstallations
              .filter((appInstallation) => appInstallation.suspended_at === null)
              .map(async (appInstallation) => {
                const app = await getApp(installationId, appInstallation.app_slug);
                return formatElbaApp(app, appInstallation, adminsIds);
              })
          );

          await elba.thirdPartyApps.updateObjects({ apps: elbaApps });
          return nextCursor;
        })
        .catch(handleError);
    } while (cursor);
    await step.run('finalize', () =>
      elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt.toISOString() })
    );

    return {
      installationId,
    };
  }
);
