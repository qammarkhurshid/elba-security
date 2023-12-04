import { env } from '@/env';
import { inngest } from '../../client';
import { getInstallations } from '../data';

export const scheduleConnectionStatusScans = inngest.createFunction(
  { id: 'schedule-connection-status-scans' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const installations = await getInstallations();

    if (installations.length > 0) {
      await step.sendEvent(
        'scan-connection-status',
        installations.map(({ id, organisationId }) => ({
          name: 'connection-status/scan',
          data: { installationId: id, organisationId },
        }))
      );
    }

    return { installationIds: installations.map(({ id }) => id) };
  }
);
