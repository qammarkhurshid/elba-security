import { Elba, type ThirdPartyAppsObject } from '@elba-security/sdk';
import type { OrganizationInstallation } from '@/repositories/github/organization';
import { getPaginatedOrganizationInstallations } from '@/repositories/github/organization';
import type { App } from '@/repositories/github/app';
import { getApp } from '@/repositories/github/app';
import { env } from '@/env';
import { inngest } from '../../client';
import { handleError } from '../utils';

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

export const scanAppsPage = inngest.createFunction(
  {
    id: 'scan-apps-page',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.THIRD_PARTY_APPS_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
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
    event: 'third-party-apps/scan-page',
  },
  async ({ event, step }) => {
    const { installationId, organisationId, accountLogin, cursor, adminsIds } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);

    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const nextCursor = await step
      .run('paginate', async () => {
        const result = await getPaginatedOrganizationInstallations(
          installationId,
          accountLogin,
          cursor
        );

        const elbaApps = await Promise.all(
          result.validInstallations
            .filter((appInstallation) => appInstallation.suspended_at === null)
            .map(async (appInstallation) => {
              const app = await getApp(installationId, appInstallation.app_slug);
              return formatElbaApp(app, appInstallation, adminsIds);
            })
        );

        if (result.validInstallations.length) {
          await elba.thirdPartyApps.updateObjects({ apps: elbaApps });
        }
        return result.nextCursor;
      })
      .catch(handleError);

    if (nextCursor) {
      await step.sendEvent('scan-apps-page', {
        name: 'third-party-apps/scan-page',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
    } else {
      await step.run('finalize', () =>
        elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt.toISOString() })
      );
      return {
        status: 'completed',
      };
    }

    return {
      status: 'ongoing',
    };
  }
);
