import { asc, eq, lt, sql, or, isNull } from 'drizzle-orm';
import { Installation, InstallationAdmin, ThirdPartyAppsSyncJob, db } from '@/database';

export type ThirdPartyAppsSyncJob = NonNullable<
  Awaited<ReturnType<typeof getThirdPartyAppsSyncJob>>
>;

export const getThirdPartyAppsSyncJob = async () => {
  const [result] = await db
    .select()
    .from(ThirdPartyAppsSyncJob)
    .leftJoin(Installation, eq(ThirdPartyAppsSyncJob.installationId, Installation.id))
    .orderBy(asc(ThirdPartyAppsSyncJob.priority), asc(ThirdPartyAppsSyncJob.syncStartedAt))
    .where(
      or(isNull(ThirdPartyAppsSyncJob.retryAfter), lt(ThirdPartyAppsSyncJob.retryAfter, sql`now()`))
    )
    .limit(1);

  if (!result) {
    return null;
  }

  if (!result.installation) {
    throw new Error('Picked third_party_apps_sync_job is missing installation');
  }

  const admins = await db
    .select({ adminId: InstallationAdmin.adminId })
    .from(InstallationAdmin)
    .where(eq(InstallationAdmin.installationId, result.installation.id));

  return {
    ...result.third_party_apps_sync_jobs,
    installation: result.installation,
    adminIds: admins.map(({ adminId }) => adminId),
  };
};

export const updateThirdPartyAppsSyncJobCursor = (installationId: number, cursor: string) =>
  db
    .update(ThirdPartyAppsSyncJob)
    .set({
      cursor,
      updatedAt: sql`now()`,
    })
    .where(eq(ThirdPartyAppsSyncJob.installationId, installationId));

export const deleteThirdPartyAppsSyncJob = (installationId: number) =>
  db.delete(ThirdPartyAppsSyncJob).where(eq(ThirdPartyAppsSyncJob.installationId, installationId));

export const updateThirdPartyAppsSyncJobRetryCount = (installationId: number, retryCount: number) =>
  db
    .update(ThirdPartyAppsSyncJob)
    .set({ retryCount, updatedAt: sql`now()` })
    .where(eq(ThirdPartyAppsSyncJob.installationId, installationId));

export const updateThirdPartyAppsSyncJobRetryAfter = (installationId: number, retryAfter: Date) =>
  db
    .update(ThirdPartyAppsSyncJob)
    .set({ retryAfter, updatedAt: sql`now()` })
    .where(eq(ThirdPartyAppsSyncJob.installationId, installationId));
