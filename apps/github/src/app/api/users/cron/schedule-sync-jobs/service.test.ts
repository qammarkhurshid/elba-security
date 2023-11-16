import { expect, test, describe } from 'vitest';
import { inArray, and, eq } from 'drizzle-orm';
import { Installation, UsersSyncJob, db } from '@/database';
import { scheduleUsersSyncJobs } from './service';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

describe('scheduleUsersSyncJobs', () => {
  test('should not schedule any jobs when there are no installation', async () => {
    await expect(scheduleUsersSyncJobs()).resolves.toStrictEqual({ installationIds: [] });
    await expect(db.select().from(UsersSyncJob)).resolves.toHaveLength(0);
  });

  test('should not schedule any jobs when there all the installations have running jobs', async () => {
    await db.insert(Installation).values(installations);
    await db.insert(UsersSyncJob).values(
      installationIds.map((installationId) => ({
        installationId,
        priority: 2,
      }))
    );
    await expect(scheduleUsersSyncJobs()).resolves.toStrictEqual({ installationIds: [] });
    await expect(db.select().from(UsersSyncJob)).resolves.toHaveLength(5);
  });

  test('should schedule jobs when installations have no running jobs', async () => {
    await db.insert(Installation).values(installations);
    await db.insert(UsersSyncJob).values(
      installationIds.slice(0, 2).map((installationId) => ({
        installationId,
        priority: 2,
      }))
    );
    await expect(scheduleUsersSyncJobs()).resolves.toStrictEqual({
      installationIds: installationIds.slice(2, installationIds.length),
    });
    await expect(
      db
        .select()
        .from(UsersSyncJob)
        .where(
          and(inArray(UsersSyncJob.installationId, installationIds), eq(UsersSyncJob.priority, 2))
        )
    ).resolves.toHaveLength(5);
  });
});
