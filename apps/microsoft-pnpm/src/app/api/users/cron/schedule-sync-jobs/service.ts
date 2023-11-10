import { db } from '@/lib/db';
import { Organization } from '@/schemas/organization';
import { syncJobs } from '@/schemas/syncJob';

const formatUserSyncJob = (org: Organization): { tenantId: string; type: 'users' } => ({
  tenantId: org.tenantId,
  type: 'users',
});

export const scheduleUserSyncJobs = async (orgsToSync: Organization[]) => {
  const syncJobsValues = orgsToSync.map(formatUserSyncJob);
  const result = await db.insert(syncJobs).values(syncJobsValues).onConflictDoNothing();
  return result;
};
