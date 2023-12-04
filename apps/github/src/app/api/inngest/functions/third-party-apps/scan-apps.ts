import { env } from '@/env';
import { getInstallationAdminsIds, getUnsuspendedInstallation } from '../data';
import { inngest } from '../../client';

export const scanApps = inngest.createFunction(
  {
    id: 'scan-apps',
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
    event: 'third-party-apps/scan',
  },
  async ({ event, step }) => {
    if (!event.ts) {
      throw new Error('No timestamp');
    }
    const syncStartedAt = new Date(event.ts);
    const { installationId, isFirstScan } = event.data;
    const [installation, adminsIds] = await step.run('initialize', () =>
      Promise.all([
        getUnsuspendedInstallation(installationId),
        getInstallationAdminsIds(installationId),
      ])
    );

    await step.sendEvent('scan-apps-page', {
      name: 'third-party-apps/scan-page',
      data: {
        installationId,
        organisationId: installation.organisationId,
        accountLogin: installation.accountLogin,
        syncStartedAt: syncStartedAt.toISOString(),
        adminsIds,
        isFirstScan,
        cursor: null,
      },
    });

    return {
      installationId,
    };
  }
);
