import { getTokenByTenantId } from '@/common/microsoft';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const startUsersScan = inngest.createFunction(
  {
    id: 'start-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'users/start',
    rateLimit: {
      key: 'event.data.tenantId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    if (!event.ts) {
      throw new Error('Missing event timestamp');
    }
    const syncStartedAt = new Date(event.ts);
    const { tenantId, isFirstScan } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    await step.sendEvent('scan-users', {
      name: 'users/scan',
      data: {
        tenantId,
        organizationId: organization.elbaOrganizationId,
        syncStartedAt: syncStartedAt.toISOString(),
        isFirstScan,
        accessToken: token.accessToken,
      },
    });
  }
);
