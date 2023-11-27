import { env } from '@/env';
import { inngest } from '../client';
import { getInstallationIds } from './data';

export const scheduleUsersScans = inngest.createFunction(
  { id: 'schedule-users-scans' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const installationIds = await getInstallationIds();

    if (installationIds.length > 0) {
      await step.sendEvent(
        'run-users-scan',
        installationIds.map((installationId) => ({
          name: 'users/scan',
          data: { installationId, isFirstScan: false },
        }))
      );
    }

    return { installationIds };
  }
);
