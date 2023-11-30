import { env } from '@/env';
import { inngest } from '../../client';
import { getInstallationIds } from '../data';

export const scheduleAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const installationIds = await getInstallationIds();

    if (installationIds.length > 0) {
      await step.sendEvent(
        'scan-apps',
        installationIds.map((installationId) => ({
          name: 'third-party-apps/scan',
          data: { installationId, isFirstScan: false },
        }))
      );
    }

    return { installationIds };
  }
);
