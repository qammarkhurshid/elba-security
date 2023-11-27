import { env } from '@/env';
import { type FunctionHandler, inngest } from '../client';
import { getInstallationIds } from './data';

export const handler: FunctionHandler = async ({ step }) => {
  const installationIds = await getInstallationIds();

  if (installationIds.length > 0) {
    await step.sendEvent(
      'run-third-party-apps-scan',
      installationIds.map((installationId) => ({
        name: 'third-party-apps/scan',
        data: { installationId, isFirstScan: false },
      }))
    );
  }

  return { installationIds };
};

export const scheduleThirdPartyAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  handler
);
