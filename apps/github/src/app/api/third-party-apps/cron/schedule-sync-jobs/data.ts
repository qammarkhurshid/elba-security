import { eq, isNull } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { Installation, ThirdPartyAppsSyncJob, UsersSyncJob, db } from '@/database';

export const getSchedulableInstallationIds = async () => {
  const installations = await db
    .select({
      id: Installation.id,
    })
    .from(Installation)
    .leftJoin(ThirdPartyAppsSyncJob, eq(Installation.id, ThirdPartyAppsSyncJob.installationId))
    .where(isNull(ThirdPartyAppsSyncJob));

  return installations.map(({ id }) => id);
};

export const insertThirdPartyAppsSyncJobs = (
  thirdPartyAppsSyncJobs: PgInsertValue<typeof ThirdPartyAppsSyncJob>[]
) => db.insert(UsersSyncJob).values(thirdPartyAppsSyncJobs).onConflictDoNothing();
