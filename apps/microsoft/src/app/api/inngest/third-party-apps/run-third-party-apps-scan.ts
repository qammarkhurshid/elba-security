/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { getTokenByTenantId } from '@/common/microsoft';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import { scanThirdPartyAppsByTenantId } from '@/repositories/microsoft/tpa';
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
    const elba = new ElbaRepository(organization.elbaOrganizationId);
    let pageLink: string | null = null;

    do {
      try {
        pageLink = await step.run('scan', async () => {
          const { thirdPartyAppsObjects, pageLink: nextPage } = await scanThirdPartyAppsByTenantId({
            tenantId,
            accessToken: token.accessToken,
            pageLink,
          });

          if (thirdPartyAppsObjects.apps.length > 0) {
            await elba.thirdPartyApps.updateObjects(thirdPartyAppsObjects.apps);
          }

          return nextPage;
        });
      } catch (error) {}
    } while (pageLink);

    await step.run('finalize', () => elba.thirdPartyApps.deleteObjects(syncStartedAt));
  }
);
