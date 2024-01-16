import { inngest } from '@/common/clients/inngest';
import { getOrganisationsToSync } from '../common/data';

export const scheduleDataProtectionSyncJobs = inngest.createFunction(
  { id: 'schedule-data-protection-sync-jobs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const syncStartedAt = new Date().toISOString();
    const organisations = await getOrganisationsToSync();
    if (organisations.length > 0) {
      await step.sendEvent(
        'create-shared-link-sync-jobs',
        organisations.map(({ organisationId }) => ({
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            organisationId,
            isFirstScan: false,
            syncStartedAt,
          },
        }))
      );
    }

    return { organisations };
  }
);
