import { Elba } from '@elba-security/sdk';
import { RequestError } from '@octokit/request-error';
import { env } from '@/env';
import { getInstallation } from '@/repositories/github/installation';
import { deleteInstallation, suspendInstallation, unsuspendInstallation } from '../data';
import { inngest } from '../../client';

export const scanConnectionStatus = inngest.createFunction(
  {
    id: 'scan-connection-status',
    retries: env.CONNECTION_STATUS_SYNC_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_CONNECTION_STATUS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'connection-status/scan',
  },
  async ({ event }) => {
    const { installationId, organisationId } = event.data;
    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    try {
      const installation = await getInstallation(installationId);
      if (installation.suspended_at) {
        await suspendInstallation(installationId, new Date(installation.suspended_at));
        await elba.connectionStatus.update({ hasError: true });
      } else {
        await unsuspendInstallation(installationId);
        await elba.connectionStatus.update({ hasError: false });
      }
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        await deleteInstallation(installationId);
        await elba.connectionStatus.update({ hasError: true });
      }
    }

    return { installationId };
  }
);
