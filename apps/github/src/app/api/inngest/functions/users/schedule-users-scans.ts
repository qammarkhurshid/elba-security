import { env } from '@/env';
import { inngest } from '../../client';
import { getUnsuspendedInstallationIds } from '../data';

export const scheduleUsersScans = inngest.createFunction(
  { id: 'schedule-users-scans' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const installationIds = await getUnsuspendedInstallationIds();

    if (installationIds.length > 0) {
      await step.sendEvent(
        'scan-users',
        installationIds.map((installationId) => ({
          name: 'users/scan',
          data: { installationId, isFirstScan: false },
        }))
      );
    }

    return { installationIds };
  }
);
