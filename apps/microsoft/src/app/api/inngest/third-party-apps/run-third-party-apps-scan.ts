/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { Elba } from 'elba-sdk';
import { getTokenByTenantId } from '@/common/microsoft';
import { scanThirdPartyAppsByTenantId } from '@/repositories/microsoft/tpa';
import { handleError } from '@/app/api/inngest/functions/utils';
import { env } from '@/common/env';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const runThirdPartyAppsScan = inngest.createFunction(
  {
    id: 'run-third-party-apps-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'third-party-apps/scan',
    rateLimit: {
      key: 'event.data.tenantId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    const syncStartedAt = new Date();
    const { tenantId } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    const elba = new Elba({
      apiKey: env.ELBA_API_KEY,
      organisationId: organization.elbaOrganizationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    let pageLink: string | undefined;

    do {
      pageLink =
        (await step
          .run('scan', async () => {
            const { thirdPartyAppsObjects, pageLink: nextPage } =
              await scanThirdPartyAppsByTenantId({
                tenantId,
                accessToken: token.accessToken,
                pageLink,
              });

            if (thirdPartyAppsObjects.apps.length > 0) {
              await elba.thirdPartyApps.updateObjects({ apps: thirdPartyAppsObjects.apps });
            }

            return nextPage;
          })
          .catch(handleError)) ?? undefined;
    } while (pageLink);

    await step.run('finalize', () =>
      elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt.toISOString() })
    );
  }
);
