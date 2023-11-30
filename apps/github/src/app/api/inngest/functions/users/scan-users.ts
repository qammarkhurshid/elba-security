import { env } from '@/env';
import { inngest } from '../../client';
import { getInstallation } from '../data';

export const scanUsers = inngest.createFunction(
  {
    id: 'scan-users',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    // idempotency: 'event.data.installationId',
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_USERS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'users/scan',
  },
  async ({ event, step }) => {
    if (!event.ts) {
      throw new Error('No timestamp');
    }
    const syncStartedAt = new Date(event.ts);
    const { installationId, isFirstScan } = event.data;
    const installation = await step.run('initialize', () => getInstallation(installationId));

    await step.sendEvent('paginate-users-scan', {
      name: 'users/scan-page',
      data: {
        installationId,
        organisationId: installation.elbaOrganizationId,
        accountLogin: installation.accountLogin,
        syncStartedAt: syncStartedAt.toISOString(),
        isFirstScan,
        cursor: null,
      },
    });

    return {
      installationId,
    };
  }
);
