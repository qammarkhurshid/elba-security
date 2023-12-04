import { env } from '@/env';
import { inngest } from '../../client';
import { getUnsuspendedInstallation } from '../data';

export const scanUsers = inngest.createFunction(
  {
    id: 'scan-users',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
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
    const installation = await step.run('initialize', () =>
      getUnsuspendedInstallation(installationId)
    );

    await step.sendEvent('scan-users-page', {
      name: 'users/scan-page',
      data: {
        installationId,
        organisationId: installation.organisationId,
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
