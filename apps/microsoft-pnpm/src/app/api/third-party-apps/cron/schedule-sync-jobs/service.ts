import { db } from '@/lib/db';
import { Organization } from '@/schemas/organization';
import { syncJobs } from '@/schemas/sync-job';

const formatThirdPartyAppsJob = (org: Organization): { tenantId: string; type: 'apps' } => ({
  tenantId: org.tenantId,
  type: 'apps',
});

export const scheduleThirdPartyAppSyncJobs = async (orgsToSync: Organization[]) => {
  const syncJobsValues = orgsToSync.map(formatThirdPartyAppsJob);
  const result = await db.insert(syncJobs).values(syncJobsValues).onConflictDoNothing();
  return result;
};
